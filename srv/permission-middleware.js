// srv/permission-middleware.js
const { rolePermissions } = require('./auth-config');

/**
 * Enhanced Permission Middleware
 * Kiểm tra quyền truy cập chi tiết dựa trên role và resource
 */
class PermissionMiddleware {
    
    /**
     * Kiểm tra quyền truy cập cho một resource và action cụ thể
     * @param {string} role - Role của user (Admin, Manager, Staff, Accountant)
     * @param {string} resource - Resource cần truy cập (user, tour, customer, etc.)
     * @param {string} action - Action cần thực hiện (create, read, update, delete)
     * @returns {boolean} - True nếu có quyền, false nếu không
     */
    static checkPermission(role, resource, action) {
        if (!role || !resource || !action) {
            console.log('❌ Permission check failed: Missing parameters', { role, resource, action });
            return false;
        }

        const permissions = rolePermissions[role];
        if (!permissions) {
            console.log('❌ Permission check failed: Invalid role', role);
            return false;
        }

        const resourcePermissions = permissions[resource];
        if (!resourcePermissions) {
            console.log('❌ Permission check failed: Resource not found', { role, resource });
            return false;
        }

        const hasPermission = resourcePermissions.includes(action);
        console.log(`🔐 Permission check: ${role} -> ${resource}:${action} = ${hasPermission ? '✅ ALLOWED' : '❌ DENIED'}`);
        
        return hasPermission;
    }

    /**
     * Middleware function để kiểm tra quyền cho CDS actions
     * @param {string} resource - Resource name
     * @param {string} action - Action name
     * @returns {Function} - Express middleware function
     */
    static requirePermission(resource, action) {
        return (req, res, next) => {
            try {
                // Lấy user từ auth middleware
                const user = req.user;
                
                if (!user || !user.role) {
                    console.log('❌ Permission denied: No user or role found');
                    return res.status(401).json({
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                }

                // Kiểm tra quyền
                const hasPermission = this.checkPermission(user.role, resource, action);
                
                if (!hasPermission) {
                    console.log(`❌ Permission denied for user: ${user.username} (${user.role})`);
                    return res.status(403).json({
                        error: 'Insufficient permissions',
                        code: 'PERMISSION_DENIED',
                        details: {
                            required: `${resource}:${action}`,
                            userRole: user.role
                        }
                    });
                }

                // Có quyền - tiếp tục
                console.log(`✅ Permission granted for ${user.username} (${user.role}) -> ${resource}:${action}`);
                next();
                
            } catch (error) {
                console.error('❌ Error in permission middleware:', error);
                return res.status(500).json({
                    error: 'Internal server error during permission check',
                    code: 'PERMISSION_ERROR'
                });
            }
        };
    }

    /**
     * Kiểm tra quyền Admin
     */
    static requireAdmin() {
        return this.requirePermission('workspace', 'create'); // Chỉ Admin mới có quyền này
    }

    /**
     * Kiểm tra quyền Manager hoặc cao hơn
     */
    static requireManagerOrAbove() {
        return (req, res, next) => {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            const allowedRoles = ['Admin', 'Manager'];
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    error: 'Manager role or higher required',
                    code: 'ROLE_INSUFFICIENT'
                });
            }
            
            next();
        };
    }

    /**
     * Workspace-level security: User chỉ được truy cập data của workspace mình
     * @param {Object} req - Request object
     * @param {string} entityWorkspaceId - WorkspaceID của entity được truy cập
     * @returns {boolean} - True nếu được phép truy cập
     */
    static checkWorkspaceAccess(req, entityWorkspaceId) {
        const user = req.user;
        
        if (!user || !user.attr || !user.attr.workspaceID) {
            console.log('❌ Workspace access denied: No user workspace info');
            return false;
        }

        const userWorkspaceId = user.attr.workspaceID;
        const hasAccess = userWorkspaceId === entityWorkspaceId;
        
        console.log(`🏢 Workspace access check: User workspace ${userWorkspaceId} vs Entity workspace ${entityWorkspaceId} = ${hasAccess ? '✅ ALLOWED' : '❌ DENIED'}`);
        
        return hasAccess;
    }

    /**
     * Middleware để filter data theo workspace
     */
    static filterByWorkspace() {
        return (req, res, next) => {
            const user = req.user;
            
            if (user && user.attr && user.attr.workspaceID) {
                // Thêm workspace filter vào query
                req.query = req.query || {};
                req.query.workspaceFilter = user.attr.workspaceID;
                console.log(`🏢 Applied workspace filter: ${user.attr.workspaceID}`);
            }
            
            next();
        };
    }

    /**
     * Lấy danh sách permissions của một role
     * @param {string} role - Role name
     * @returns {Object} - Permissions object
     */
    static getUserPermissions(role) {
        return rolePermissions[role] || {};
    }

    /**
     * Kiểm tra multiple permissions cùng lúc
     * @param {string} role - User role
     * @param {Array} requiredPermissions - Array of {resource, action} objects
     * @returns {boolean} - True nếu có tất cả permissions
     */
    static checkMultiplePermissions(role, requiredPermissions) {
        return requiredPermissions.every(({ resource, action }) => 
            this.checkPermission(role, resource, action)
        );
    }

    /**
     * Generate permission summary cho user
     * @param {string} role - User role
     * @returns {Object} - Permission summary
     */
    static getPermissionSummary(role) {
        const permissions = this.getUserPermissions(role);
        const summary = {
            role: role,
            canManageUsers: this.checkPermission(role, 'user', 'create'),
            canManageWorkspace: this.checkPermission(role, 'workspace', 'update'),
            canManageTours: this.checkPermission(role, 'tour', 'create'),
            canManageOrders: this.checkPermission(role, 'order', 'create'),
            canManageFinance: this.checkPermission(role, 'finance', 'create'),
            canViewReports: this.checkPermission(role, 'finance', 'read'),
            fullPermissions: permissions
        };
        
        return summary;
    }
}

module.exports = PermissionMiddleware;