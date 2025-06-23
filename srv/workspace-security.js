/**
 * Workspace Security Helper
 * Đảm bảo users chỉ có thể truy cập data thuộc workspace của họ
 */

const cds = require('@sap/cds');

class WorkspaceSecurity {
    
    /**
     * Thêm workspace filter vào CDS query
     * @param {Object} req - CDS request object
     * @param {Object} query - CDS query object
     * @returns {Object} - Modified query with workspace filter
     */
    static addWorkspaceFilter(req, query) {
        const user = req.user;
        
        if (!user || !user.attr || !user.attr.workspaceID) {
            console.log('No workspace filter applied - missing user workspace info');
            return query;
        }
        
        const workspaceID = user.attr.workspaceID;
        console.log(`Adding workspace filter: ${workspaceID}`);
        
        // Add workspace filter to existing where conditions
        if (query.SELECT && query.SELECT.where) {
            query.SELECT.where = [
                query.SELECT.where,
                'and',
                { ref: ['WorkspaceID'] },
                '=',
                { val: workspaceID }
            ];
        } else if (query.SELECT) {
            query.SELECT.where = [
                { ref: ['WorkspaceID'] },
                '=',
                { val: workspaceID }
            ];
        }
        
        return query;
    }
    
    /**
     * Middleware cho CDS services để tự động apply workspace filter
     * @param {Object} service - CDS service object
     */
    static applyWorkspaceFiltering(service) {
        // Apply to READ operations
        service.before('READ', '*', (req) => {
            const entityName = req.target.name;
            
            // Entities có WorkspaceID field
            const workspaceEntities = [
                'tourish.management.User',
                'tourish.management.TourTemplate', 
                'tourish.management.ActiveTour',
                'tourish.management.Customer',
                'tourish.management.Order',
                'tourish.management.Supplier',
                'tourish.management.Payment'
            ];
            
            if (workspaceEntities.includes(entityName)) {
                req.query = this.addWorkspaceFilter(req, req.query);
                console.log(`Applied workspace filtering to ${entityName}`);
            }
        });
        
        // Apply to CREATE operations - auto-set WorkspaceID
        service.before('CREATE', '*', (req) => {
            const user = req.user;
            const entityName = req.target.name;
            
            const workspaceEntities = [
                'tourish.management.User',
                'tourish.management.TourTemplate',
                'tourish.management.ActiveTour', 
                'tourish.management.Customer',
                'tourish.management.Order',
                'tourish.management.Supplier',
                'tourish.management.Payment'
            ];
            
            if (workspaceEntities.includes(entityName) && user && user.attr && user.attr.workspaceID) {
                req.data.WorkspaceID = user.attr.workspaceID;
                console.log(`Auto-set WorkspaceID for new ${entityName}: ${user.attr.workspaceID}`);
            }
        });
        
        // Apply to UPDATE/DELETE operations - verify ownership
        service.before(['UPDATE', 'DELETE'], '*', async (req) => {
            const user = req.user;
            const entityName = req.target.name;
            
            const workspaceEntities = [
                'tourish.management.User',
                'tourish.management.TourTemplate',
                'tourish.management.ActiveTour',
                'tourish.management.Customer', 
                'tourish.management.Order',
                'tourish.management.Supplier',
                'tourish.management.Payment'
            ];
            
            if (workspaceEntities.includes(entityName) && user && user.attr && user.attr.workspaceID) {
                // Verify user can only modify records in their workspace
                const recordId = req.params[0]; // Assuming first param is ID
                
                if (recordId) {
                    const existing = await cds.run(
                        SELECT.one.from(entityName)
                            .where({ ID: recordId })
                            .columns(['WorkspaceID'])
                    );
                    
                    if (existing && existing.WorkspaceID !== user.attr.workspaceID) {
                        console.log(`Workspace access denied: User ${user.username} cannot modify record in different workspace`);
                        req.error(403, 'Access denied: Record belongs to different workspace', 'WORKSPACE_ACCESS_DENIED');
                        return;
                    }
                }
            }
        });
    }
    
    /**
     * Verify user can access specific record
     * @param {Object} req - Request object
     * @param {string} entityName - Entity name
     * @param {string} recordId - Record ID
     * @returns {Promise<boolean>} - True if user can access record
     */
    static async verifyRecordAccess(req, entityName, recordId) {
        const user = req.user;
        
        if (!user || !user.attr || !user.attr.workspaceID) {
            return false;
        }
        
        try {
            const record = await cds.run(
                SELECT.one.from(entityName)
                    .where({ ID: recordId })
                    .columns(['WorkspaceID'])
            );
            
            if (!record) {
                console.log(`Record not found: ${entityName}/${recordId}`);
                return false;
            }
            
            const hasAccess = record.WorkspaceID === user.attr.workspaceID;
            console.log(`Record access check: ${hasAccess ? 'ALLOWED' : 'DENIED'} for ${entityName}/${recordId}`);
            
            return hasAccess;
            
        } catch (error) {
            console.error('Error verifying record access:', error);
            return false;
        }
    }
    
    /**
     * Get user's workspace info
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Workspace information
     */
    static async getUserWorkspace(req) {
        const user = req.user;
        
        if (!user || !user.attr || !user.attr.workspaceID) {
            return null;
        }
        
        try {
            const workspace = await cds.run(
                SELECT.one.from('tourish.management.Workspace')
                    .where({ ID: user.attr.workspaceID })
            );
            
            return workspace;
            
        } catch (error) {
            console.error('Error getting user workspace:', error);
            return null;
        }
    }
    
    /**
     * Check if user is workspace admin (has Admin role in their workspace)
     * @param {Object} req - Request object
     * @returns {boolean} - True if user is workspace admin
     */
    static isWorkspaceAdmin(req) {
        const user = req.user;
        return user && user.role === 'Admin';
    }
    
    /**
     * Get workspace members (for Admin only)
     * @param {Object} req - Request object
     * @returns {Promise<Array>} - Array of workspace members
     */
    static async getWorkspaceMembers(req) {
        const user = req.user;
        
        if (!this.isWorkspaceAdmin(req)) {
            throw new Error('Only workspace admin can view members');
        }
        
        try {
            const members = await cds.run(
                SELECT.from('tourish.management.User')
                    .where({ WorkspaceID: user.attr.workspaceID })
                    .columns(['ID', 'Username', 'Role', 'FullName', 'Email', 'Phone', 'Status'])
            );
            
            return members;
            
        } catch (error) {
            console.error('Error getting workspace members:', error);
            throw error;
        }
    }
}

module.exports = WorkspaceSecurity;