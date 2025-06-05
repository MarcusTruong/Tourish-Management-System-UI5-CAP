const rolePermissions = {
    Admin: {
      workspace: ['create', 'read', 'update', 'delete'],
      user: ['create', 'read', 'update', 'delete'],
      tour: ['create', 'read', 'update', 'delete'],
      customer: ['create', 'read', 'update', 'delete'],
      order: ['create', 'read', 'update', 'delete'],
      payment: ['create', 'read', 'update', 'delete'],
      supplier: ['create', 'read', 'update', 'delete'],
      finance: ['create', 'read', 'update', 'delete']
    },
    Manager: {
      workspace: [],
      user: ['read'],
      tour: ['create', 'read', 'update', 'delete'],
      customer: ['create', 'read', 'update', 'delete'],
      order: ['create', 'read', 'update', 'delete'],
      payment: ['read'],
      supplier: ['create', 'read', 'update', 'delete'],
      finance: ['read']
    },
    Accountant: {
      workspace: [],
      user: ['read'],
      tour: ['read'],
      customer: ['read'],
      order: ['read'],
      payment: ['create', 'read', 'update', 'delete'],
      supplier: ['read', 'update'], // chỉ update debt
      finance: ['create', 'read', 'update', 'delete']
    },
    Staff: {
      workspace: [],
      user: ['read'],
      tour: ['read'],
      customer: ['read'],
      order: ['create', 'read', 'update'],
      payment: [],
      supplier: ['read'],
      finance: ['read'] // chỉ basic reports
    }
  };
  
  module.exports = { rolePermissions };