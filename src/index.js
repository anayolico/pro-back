'use strict';

const dns = require('dns');
// Use Google DNS for resolving to bypass the broken system DNS that causes EAI_AGAIN
dns.setServers(['8.8.8.8', '8.8.4.4']);

const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  // Use resolve4 for Cloudinary and Neon to bypass OS getaddrinfo
  if (hostname.includes('cloudinary.com') || hostname.includes('neon.tech')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return originalLookup(hostname, options, callback);
      }
      if (options && options.all) {
        callback(null, addresses.map(addr => ({ address: addr, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    });
    return;
  }
  
  originalLookup(hostname, options, callback);
};

// Prevent the server from crashing entirely if an upload stream throws an unhandled socket error
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

module.exports = {
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    try {
      const roleService = strapi.plugin('users-permissions').service('role');

      // Get all roles and find the public one
      const roles = await roleService.find();
      const publicRole = roles.find((r) => r.type === 'public');

      if (!publicRole) {
        strapi.log.warn('[bootstrap] Public role not found.');
        return;
      }

      strapi.log.info(`[bootstrap] Found public role id=${publicRole.id}`);

      // Get the full role with its current permission tree (via findOne)
      // findOne returns permissions as a nested object keyed by TYPE (e.g. 'api::skill'),
      // NOT by UID (e.g. 'api::skill.skill').
      const role = await roleService.findOne(publicRole.id);

      // ── Enable read permissions for portfolio content types ──
      // Keys must match the TYPE part of the action string:
      //   action "api::skill.skill.find" splits into type="api::skill", controller="skill", action="find"
      //   So the key in role.permissions is "api::skill"
      const apisToEnable = ['project', 'skill', 'experience', 'strength'];
      for (const api of apisToEnable) {
        const typeKey = `api::${api}`;
        if (role.permissions[typeKey]?.controllers?.[api]) {
          role.permissions[typeKey].controllers[api].find = { enabled: true, policy: '' };
          role.permissions[typeKey].controllers[api].findOne = { enabled: true, policy: '' };
          strapi.log.info(`[bootstrap] Marking ${typeKey}.${api}.find + findOne as enabled`);
        } else {
          strapi.log.warn(`[bootstrap] Could not find permission path for ${typeKey}.controllers.${api}`);
        }
      }

      // Enable contact form submissions
      const contactKey = 'api::contact';
      if (role.permissions[contactKey]?.controllers?.contact) {
        role.permissions[contactKey].controllers.contact.create = { enabled: true, policy: '' };
        strapi.log.info(`[bootstrap] Marking ${contactKey}.contact.create as enabled`);
      }

      // ── Persist via updateRole (handles delete old + create new with correct role link) ──
      await roleService.updateRole(publicRole.id, role);
      strapi.log.info('[bootstrap] ✅ Public permissions updated successfully!');

      // ── Cleanup: remove orphaned permission records (no role link) ──
      const allPerms = await strapi.db.query('plugin::users-permissions.permission').findMany({
        populate: ['role'],
      });
      const orphaned = allPerms.filter((p) => !p.role);
      if (orphaned.length > 0) {
        for (const p of orphaned) {
          await strapi.db.query('plugin::users-permissions.permission').delete({
            where: { id: p.id },
          });
        }
        strapi.log.info(`[bootstrap] 🧹 Cleaned up ${orphaned.length} orphaned permission records.`);
      }

    } catch (err) {
      strapi.log.error('[bootstrap] ❌ Error: ' + err.message);
      strapi.log.error('[bootstrap] Stack: ' + err.stack);
    }
  },
};
