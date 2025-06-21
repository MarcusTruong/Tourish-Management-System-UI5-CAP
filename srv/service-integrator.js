/**
 * Service Security Integrator
 * Tích hợp permission checking và workspace security vào tất cả CDS services
 */

const PermissionMiddleware = require('./permission-middleware');
const WorkspaceSecurity = require('./workspace-security');
const { createProtectedAction } = require('./user-service');

class ServiceIntegrator {
    
    /**
     * Setup security cho tất cả services
     * @param {Object} srv - CDS service object
     * @param {string} serviceName - Tên service (user, tour, customer, order, supplier)
     */
    static setupServiceSecurity(srv, serviceName) {
        console.log(`🔧 Setting up security for ${serviceName} service`);
        
        // Apply workspace filtering
        WorkspaceSecurity.applyWorkspaceFiltering(srv);
        
        // Setup permission-based action handlers
        this.setupPermissionHandlers(srv, serviceName);
        
        // Setup custom error handling
        this.setupErrorHandling(srv);
        
        console.log(`✅ Security setup completed for ${serviceName} service`);
    }
    
    /**
     * Setup permission handlers cho các actions
     * @param {Object} srv - CDS service object  
     * @param {string} serviceName - Service name
     */
    static setupPermissionHandlers(srv, serviceName) {
        const resourceMap = {
            'user': 'user',
            'tour': 'tour', 
            'customer': 'customer',
            'order': 'order',
            'supplier': 'supplier',
            'finance': 'finance'
        };
        
        const resource = resourceMap[serviceName];
        if (!resource) return;
        
        // Protect entity READ operations based on role
        srv.before('READ', '*', async (req) => {
            const user = req.user;
            const entityName = req.target.name;
            
            console.log(`🔐 READ permission check: ${user?.role} accessing ${entityName}`);
            
            if (!user) {
                req.error(401, 'Authentication required', 'AUTH_REQUIRED');
                return;
            }
            
            // Check basic read permission
            if (!PermissionMiddleware.checkPermission(user.role, resource, 'read')) {
                req.error(403, `No read permission for ${resource}`, 'PERMISSION_DENIED');
                return;
            }
        });
        
        // Protect entity CREATE operations
        srv.before('CREATE', '*', async (req) => {
            const user = req.user;
            const entityName = req.target.name;
            
            console.log(`🔐 CREATE permission check: ${user?.role} creating ${entityName}`);
            
            if (!user) {
                req.error(401, 'Authentication required', 'AUTH_REQUIRED');
                return;
            }
            
            if (!PermissionMiddleware.checkPermission(user.role, resource, 'create')) {
                req.error(403, `No create permission for ${resource}`, 'PERMISSION_DENIED');
                return;
            }
        });
        
        // Protect entity UPDATE operations
        srv.before('UPDATE', '*', async (req) => {
            const user = req.user;
            const entityName = req.target.name;
            
            console.log(`🔐 UPDATE permission check: ${user?.role} updating ${entityName}`);
            
            if (!user) {
                req.error(401, 'Authentication required', 'AUTH_REQUIRED');
                return;
            }
            
            if (!PermissionMiddleware.checkPermission(user.role, resource, 'update')) {
                req.error(403, `No update permission for ${resource}`, 'PERMISSION_DENIED');
                return;
            }
        });
        
        // Protect entity DELETE operations
        srv.before('DELETE', '*', async (req) => {
            const user = req.user;
            const entityName = req.target.name;
            
            console.log(`🔐 DELETE permission check: ${user?.role} deleting ${entityName}`);
            
            if (!user) {
                req.error(401, 'Authentication required', 'AUTH_REQUIRED');
                return;
            }
            
            if (!PermissionMiddleware.checkPermission(user.role, resource, 'delete')) {
                req.error(403, `No delete permission for ${resource}`, 'PERMISSION_DENIED');
                return;
            }
        });
    }
    
    /**
     * Setup error handling cho service
     * @param {Object} srv - CDS service object
     */
    static setupErrorHandling(srv) {
        srv.on('error', (err, req) => {
            console.error('❌ Service error:', {
                user: req.user?.username,
                action: req.event,
                entity: req.target?.name,
                error: err.message
            });
            
            // Log additional details for debugging
            if (err.code === 'PERMISSION_DENIED') {
                console.error('Permission denied details:', {
                    userRole: req.user?.role,
                    requiredPermission: err.details
                });
            }
        });
    }
    
    /**
     * Tạo protected action wrapper
     * @param {string} resource - Resource name
     * @param {string} action - Action name
     * @param {Function} handler - Original handler function
     * @returns {Function} - Protected handler
     */
    static createProtectedActionHandler(resource, action, handler) {
        return async function(req) {
            try {
                const user = req.user;
                
                // Authentication check
                if (!user) {
                    req.error(401, 'Authentication required', 'AUTH_REQUIRED');
                    return;
                }
                
                // Permission check
                if (!PermissionMiddleware.checkPermission(user.role, resource, action)) {
                    console.log(`❌ Action permission denied: ${user.username} (${user.role}) -> ${resource}:${action}`);
                    req.error(403, `Insufficient permissions for ${resource}:${action}`, 'PERMISSION_DENIED');
                    return;
                }
                
                console.log(`✅ Action permission granted: ${user.username} (${user.role}) -> ${resource}:${action}`);
                
                // Call original handler
                return await handler.call(this, req);
                
            } catch (error) {
                console.error(`❌ Error in protected action ${resource}:${action}:`, error);
                req.error(500, `Service error: ${error.message}`, 'SERVICE_ERROR');
            }
        };
    }
    
    /**
     * Setup specific action permissions cho User Service
     * @param {Object} srv - User service object
     */
    static setupUserServiceActions(srv) {
        console.log('🔧 Setting up User Service action permissions');
        
        // Wrap existing handlers with permission checks
        const originalHandlers = {
            createWorkspace: srv.handlers.createWorkspace,
            addUser: srv.handlers.addUser,
            updateUserPermissions: srv.handlers.updateUserPermissions,
            updateUserStatus: srv.handlers.updateUserStatus,
            removeUserFromWorkspace: srv.handlers.removeUserFromWorkspace,
            getWorkspaceMembers: srv.handlers.getWorkspaceMembers,
            updateWorkspaceInfo: srv.handlers.updateWorkspaceInfo
        };
        
        // Apply permission checks
        if (originalHandlers.createWorkspace) {
            srv.on('createWorkspace', this.createProtectedActionHandler('workspace', 'create', originalHandlers.createWorkspace));
        }
        
        if (originalHandlers.addUser) {
            srv.on('addUser', this.createProtectedActionHandler('user', 'create', originalHandlers.addUser));
        }
        
        if (originalHandlers.updateUserPermissions) {
            srv.on('updateUserPermissions', this.createProtectedActionHandler('user', 'update', originalHandlers.updateUserPermissions));
        }
        
        if (originalHandlers.updateUserStatus) {
            srv.on('updateUserStatus', this.createProtectedActionHandler('user', 'update', originalHandlers.updateUserStatus));
        }
        
        if (originalHandlers.removeUserFromWorkspace) {
            srv.on('removeUserFromWorkspace', this.createProtectedActionHandler('user', 'delete', originalHandlers.removeUserFromWorkspace));
        }
        
        if (originalHandlers.getWorkspaceMembers) {
            srv.on('getWorkspaceMembers', this.createProtectedActionHandler('user', 'read', originalHandlers.getWorkspaceMembers));
        }
        
        if (originalHandlers.updateWorkspaceInfo) {
            srv.on('updateWorkspaceInfo', this.createProtectedActionHandler('workspace', 'update', originalHandlers.updateWorkspaceInfo));
        }
    }
    
    /**
     * Add permission info action để frontend có thể query permissions
     * @param {Object} srv - Service object
     */
    static addPermissionInfoAction(srv) {
        srv.on('getUserPermissions', async (req) => {
            const user = req.user;
            
            if (!user) {
                req.error(401, 'Authentication required', 'AUTH_REQUIRED');
                return;
            }
            
            const permissions = PermissionMiddleware.getPermissionSummary(user.role);
            const workspace = await WorkspaceSecurity.getUserWorkspace(req);
            
            return {
                user: {
                    username: user.username,
                    role: user.role,
                    fullName: user.attr?.fullName,
                    email: user.attr?.email
                },
                workspace: workspace ? {
                    id: workspace.ID,
                    companyName: workspace.CompanyName,
                    address: workspace.Address
                } : null,
                permissions: permissions,
                isWorkspaceAdmin: WorkspaceSecurity.isWorkspaceAdmin(req)
            };
        });
    }
    
    /**
     * Setup audit logging cho security events
     * @param {Object} srv - Service object
     */
    static setupAuditLogging(srv) {
        // Log successful operations
        srv.after('*', (results, req) => {
            if (req.user && ['CREATE', 'UPDATE', 'DELETE'].includes(req.event)) {
                console.log('📋 Audit log:', {
                    timestamp: new Date().toISOString(),
                    user: req.user.username,
                    role: req.user.role,
                    action: req.event,
                    entity: req.target?.name,
                    success: true
                });
            }
        });
        
        // Log failed operations
        srv.on('error', (err, req) => {
            if (req.user && ['PERMISSION_DENIED', 'AUTH_REQUIRED'].includes(err.code)) {
                console.log('📋 Security audit log:', {
                    timestamp: new Date().toISOString(),
                    user: req.user?.username || 'anonymous',
                    role: req.user?.role || 'none',
                    action: req.event,
                    entity: req.target?.name,
                    error: err.code,
                    success: false
                });
            }
        });
    }
    
    /**
     * Initialize complete security setup cho một service
     * @param {Object} srv - CDS service object
     * @param {string} serviceName - Service name
     */
    static initializeServiceSecurity(srv, serviceName) {
        console.log(`🚀 Initializing complete security for ${serviceName} service`);
        
        // Basic security setup
        this.setupServiceSecurity(srv, serviceName);
        
        // Add permission info action
        this.addPermissionInfoAction(srv);
        
        // Setup audit logging
        this.setupAuditLogging(srv);
        
        // Service-specific setups
        if (serviceName === 'user') {
            this.setupUserServiceActions(srv);
        }
        
        console.log(`✅ Complete security initialization done for ${serviceName} service`);
    }
}

module.exports = ServiceIntegrator;