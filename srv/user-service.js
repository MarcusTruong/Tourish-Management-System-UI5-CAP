// srv/user-service.js
const cds = require('@sap/cds');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import permission system
const PermissionMiddleware = require('./permission-middleware');
const WorkspaceSecurity = require('./workspace-security');
const ServiceIntegrator = require('./service-integrator');

// Constants
const JWT_SECRET = 'your-secret-key-12345';
const SALT_ROUNDS = 10;

// ===== UTILITY FUNCTIONS =====

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hashedPassword) {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error('Error comparing password:', error);
        throw error;
    }
}

/**
 * Enhanced JWT token generation with workspace info
 */
function generateToken(user) {
    const payload = {
        id: user.ID,
        username: user.Username,
        role: user.Role,
        workspaceID: user.WorkspaceID,
        fullName: user.FullName,
        email: user.Email,
        status: user.Status
    };
    
    console.log('🔐 Generating JWT token for user:', {
        username: user.Username,
        role: user.Role,
        workspaceID: user.WorkspaceID
    });
    
    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: '72h'
    });
}

/**
 * Password validation
 */
function validatePassword(password) {
    if (!password || password.length < 6) {
        return {
            valid: false,
            message: 'Password must be at least 6 characters long'
        };
    }
    return { valid: true };
}

/**
 * Get permission summary for role
 */
function getPermissionSummary(role) {
    return PermissionMiddleware.getPermissionSummary(role);
}

/**
 * Create protected action handler
 */
function createProtectedAction(resource, action, handler) {
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
                console.log(`❌ Permission denied: ${user.username} (${user.role}) -> ${resource}:${action}`);
                req.error(403, `Insufficient permissions for ${resource}:${action}`, 'PERMISSION_DENIED');
                return;
            }
            
            console.log(`✅ Permission granted: ${user.username} (${user.role}) -> ${resource}:${action}`);
            
            // Call original handler
            return await handler.call(this, req);
            
        } catch (error) {
            console.error(`❌ Error in protected action ${resource}:${action}:`, error);
            req.error(500, `Service error: ${error.message}`, 'SERVICE_ERROR');
        }
    };
}

// ===== MAIN SERVICE IMPLEMENTATION =====

module.exports = (srv) => {
    const { Workspaces, Users } = srv.entities;

    // ===== PUBLIC ACTIONS (No authentication required) =====

    /**
     * User registration (Public)
     */
    srv.on('createUser', async (req) => {
        console.log('>>> createUser handler called with data:', req.data);
        const { username, password, fullName, email, phone } = req.data;
        const tx = cds.transaction(req);

        try {
            // Check if username already exists
            const existingUser = await tx.run(
                SELECT.one.from(Users).where({ Username: username })
            );
            
            if (existingUser) {
                return {
                    success: false,
                    message: 'Username already exists'
                };
            }

            // Validate password
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    message: passwordValidation.message
                };
            }

            // Hash password and create user
            const hashedPassword = await hashPassword(password);
            const user = {
                ID: cds.utils.uuid(),
                WorkspaceID: null, // New user doesn't belong to any workspace yet
                Username: username,
                Password: hashedPassword,
                Role: 'Admin', // Default role for new registration
                FullName: fullName,
                Email: email,
                Phone: phone,
                Status: 'Active'
            };

            await tx.run(INSERT.into(Users).entries(user));
            const createdUser = await tx.run(
                SELECT.one.from(Users).where({ ID: user.ID })
            );
            await tx.commit();

            console.log('✅ User registered successfully:', createdUser.Username);
            
            return {
                ID: createdUser.ID,
                WorkspaceID: createdUser.WorkspaceID,
                Username: createdUser.Username,
                Role: createdUser.Role,
                FullName: createdUser.FullName,
                Email: createdUser.Email,
                Phone: createdUser.Phone,
                Status: createdUser.Status
            };

        } catch (error) {
            console.error('❌ Error in createUser:', error);
            await tx.rollback();
            req.error(500, `Failed to create user: ${error.message}`);
        }
    });

    /**
     * Authentication (Public)
     */
    srv.on('authenticate', async (req) => {
        console.log('>>> authenticate handler called with data:', req.data);
        const { username, password } = req.data;

        try {
            // Query user with all necessary info
            const user = await SELECT.one.from(Users)
                .where({ Username: username })
                .columns([
                    'ID', 'Username', 'Password', 'Role', 'WorkspaceID',
                    'FullName', 'Email', 'Phone', 'Status'
                ]);

            if (!user) {
                console.log('❌ Authentication failed: User not found for username:', username);
                return {
                    success: false,
                    user: null,
                    token: null,
                    message: 'Invalid username or password',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Check user status
            if (user.Status !== 'Active') {
                return {
                    success: false,
                    user: null,
                    token: null,
                    message: 'Account is not active. Please contact administrator.',
                    code: 'ACCOUNT_INACTIVE'
                };
            }

            // Verify password
            const isPasswordValid = await comparePassword(password, user.Password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    user: null,
                    token: null,
                    message: 'Invalid username or password',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Generate enhanced JWT token
            const token = generateToken(user);

            console.log('✅ Authentication successful for username:', username, 'Role:', user.Role);

            return {
                success: true,
                user: {
                    ID: user.ID,
                    WorkspaceID: user.WorkspaceID,
                    Username: user.Username,
                    Role: user.Role,
                    FullName: user.FullName,
                    Email: user.Email,
                    Phone: user.Phone,
                    Status: user.Status
                },
                token: token,
                permissions: getPermissionSummary(user.Role), 
                message: 'Authentication successful'
            };

        } catch (error) {
            console.error('❌ Error in authenticate:', error);
            return {
                success: false,
                user: null,
                token: null,
                message: 'Authentication service error',
                code: 'AUTH_SERVICE_ERROR'
            };
        }
    });

    // ===== PROTECTED ACTIONS (Admin only) =====

    /**
     * Create workspace (Admin only)
     */
    srv.on('createWorkspace', createProtectedAction('workspace', 'create', async (req) => {
        console.log('>>> createWorkspace handler called with data:', req.data);
        const { companyName, address, phone, email } = req.data;
        const tx = cds.transaction(req);

        try {
            const user = req.user;
            
            // Check if user already has a workspace
            if (user.attr && user.attr.workspaceID) {
                return {
                    success: false,
                    message: 'User already belongs to a workspace'
                };
            }

            // Create workspace
            const workspace = {
                ID: cds.utils.uuid(),
                CompanyName: companyName,
                Address: address,
                Phone: phone,
                Email: email
            };

            await tx.run(INSERT.into(Workspaces).entries(workspace));

            // Update user's WorkspaceID
            const userFromDB = await tx.run(
                SELECT.one.from(Users).where({ Username: user.username })
            );

            if (userFromDB) {
                await tx.run(
                    UPDATE(Users)
                        .set({ WorkspaceID: workspace.ID })
                        .where({ ID: userFromDB.ID })
                );
            }

            await tx.commit();

            console.log('✅ Workspace created successfully:', workspace.ID);

            return {
                ID: workspace.ID,
                CompanyName: workspace.CompanyName,
                Address: workspace.Address,
                Phone: workspace.Phone,
                Email: workspace.Email
            };

        } catch (error) {
            console.error('❌ Error in createWorkspace:', error);
            await tx.rollback();
            req.error(500, `Failed to create workspace: ${error.message}`);
        }
    }));

    /**
     * Add user to workspace (Admin only)
     */
    srv.on('addUser', createProtectedAction('user', 'create', async (req) => {
        console.log('>>> addUser handler called with data:', req.data);
        const { username, password, role, fullName, email, phone } = req.data;
        const tx = cds.transaction(req);

        try {
            const currentUser = req.user;
            
            if (!currentUser.attr || !currentUser.attr.workspaceID) {
                req.error(400, 'Admin must belong to a workspace to add users');
                return;
            }

            // Check if username already exists
            const existingUser = await tx.run(
                SELECT.one.from(Users).where({ Username: username })
            );

            if (existingUser) {
                return {
                    success: false,
                    message: 'Username already exists'
                };
            }

            // Validate role
            const validRoles = ['Admin', 'Manager', 'Staff', 'Accountant'];
            if (!validRoles.includes(role)) {
                return {
                    success: false,
                    message: 'Invalid role'
                };
            }

            // Validate password
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    message: passwordValidation.message
                };
            }

            // Create user
            const hashedPassword = await hashPassword(password);
            const newUser = {
                ID: cds.utils.uuid(),
                WorkspaceID: currentUser.attr.workspaceID,
                Username: username,
                Password: hashedPassword,
                Role: role,
                FullName: fullName,
                Email: email,
                Phone: phone,
                Status: 'Active'
            };

            await tx.run(INSERT.into(Users).entries(newUser));
            await tx.commit();

            console.log('✅ User added successfully:', newUser.Username);

            return {
                ID: newUser.ID,
                WorkspaceID: newUser.WorkspaceID,
                Username: newUser.Username,
                Role: newUser.Role,
                FullName: newUser.FullName,
                Email: newUser.Email,
                Phone: newUser.Phone,
                Status: newUser.Status
            };

        } catch (error) {
            console.error('❌ Error in addUser:', error);
            await tx.rollback();
            req.error(500, `Failed to add user: ${error.message}`);
        }
    }));

    /**
     * Update user permissions (Admin only)
     */
    srv.on('updateUserPermissions', createProtectedAction('user', 'update', async (req) => {
        console.log('>>> updateUserPermissions handler called with data:', req.data);
        const { userID, role } = req.data;
        const tx = cds.transaction(req);

        try {
            const currentUser = req.user;

            // Validate role
            const validRoles = ['Admin', 'Manager', 'Staff', 'Accountant'];
            if (!validRoles.includes(role)) {
                return {
                    success: false,
                    message: 'Invalid role'
                };
            }

            // Check if target user exists and belongs to same workspace
            const targetUser = await tx.run(
                SELECT.one.from(Users).where({ ID: userID })
            );

            if (!targetUser) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Verify workspace access
            // if (!WorkspaceSecurity.checkWorkspaceAccess(req, targetUser.WorkspaceID)) {
            //     req.error(403, 'Cannot modify user from different workspace');
            //     return;
            // }

            // Update user role
            await tx.run(
                UPDATE(Users)
                    .set({ Role: role })
                    .where({ ID: userID })
            );

            const updatedUser = await tx.run(
                SELECT.one.from(Users).where({ ID: userID })
            );

            await tx.commit();

            console.log('✅ User permissions updated successfully:', updatedUser.Username);

            return updatedUser;

        } catch (error) {
            console.error('❌ Error in updateUserPermissions:', error);
            await tx.rollback();
            req.error(500, `Failed to update user permissions: ${error.message}`);
        }
    }));

    /**
     * Update user status (Admin only)
     */
    srv.on('updateUserStatus', createProtectedAction('user', 'update', async (req) => {
        console.log('>>> updateUserStatus handler called with data:', req.data);
        const { userID, status } = req.data;
        const tx = cds.transaction(req);

        try {
            // Validate status
            const validStatuses = ['Active', 'Inactive'];
            if (!validStatuses.includes(status)) {
                return {
                    success: false,
                    message: 'Invalid status'
                };
            }

            // Check if target user exists and verify workspace access
            const targetUser = await tx.run(
                SELECT.one.from(Users).where({ ID: userID })
            );

            if (!targetUser) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Update user status
            await tx.run(
                UPDATE(Users)
                    .set({ Status: status })
                    .where({ ID: userID })
            );

            await tx.commit();

            console.log('User status updated successfully:', targetUser.Username, 'to', status);

            return {
                success: true,
                message: `User status updated to ${status}`
            };

        } catch (error) {
            console.error('Error in updateUserStatus:', error);
            await tx.rollback();
            req.error(500, `Failed to update user status: ${error.message}`);
        }
    }));

    /**
     * Remove user from workspace (Admin only)
     */
    srv.on('removeUserFromWorkspace', createProtectedAction('user', 'delete', async (req) => {
        console.log('>>> removeUserFromWorkspace handler called with data:', req.data);
        const { userID } = req.data;
        const tx = cds.transaction(req);

        try {
            const currentUser = req.user;

            // Check if target user exists
            const targetUser = await tx.run(
                SELECT.one.from(Users).where({ ID: userID })
            );

            if (!targetUser) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Verify workspace access
            // if (!WorkspaceSecurity.checkWorkspaceAccess(req, targetUser.WorkspaceID)) {
            //     req.error(403, 'Cannot remove user from different workspace');
            //     return;
            // }

            // Cannot remove self
            if (targetUser.Username === currentUser.username) {
                return {
                    success: false,
                    message: 'Cannot remove yourself'
                };
            }

            // Remove user (set WorkspaceID to null instead of deleting)
            await tx.run(
                UPDATE(Users)
                    .set({ WorkspaceID: null, Status: 'Inactive' })
                    .where({ ID: userID })
            );

            await tx.commit();

            console.log('✅ User removed from workspace successfully:', targetUser.Username);

            return {
                success: true,
                message: 'User removed from workspace successfully'
            };

        } catch (error) {
            console.error('❌ Error in removeUserFromWorkspace:', error);
            await tx.rollback();
            req.error(500, `Failed to remove user: ${error.message}`);
        }
    }));

    /**
     * Get workspace members (Admin only)
     */
    srv.on('getWorkspaceMembers', createProtectedAction('user', 'read', async (req) => {
        console.log('>>> getWorkspaceMembers handler called');

        try {
            const members = await WorkspaceSecurity.getWorkspaceMembers(req);
            
            console.log('✅ Retrieved workspace members:', members.length);
            
            return members;

        } catch (error) {
            console.error('❌ Error in getWorkspaceMembers:', error);
            req.error(500, `Failed to get workspace members: ${error.message}`);
        }
    }));

    /**
     * Update workspace info (Admin only)
     */
    srv.on('updateWorkspaceInfo', createProtectedAction('workspace', 'update', async (req) => {
        console.log('>>> updateWorkspaceInfo handler called with data:', req.data);
        const { companyName, address, phone, email } = req.data;
        const tx = cds.transaction(req);

        try {
            const user = req.user;

            if (!user.attr || !user.attr.workspaceID) {
                req.error(400, 'User must belong to a workspace');
                return;
            }

            // Update workspace
            await tx.run(
                UPDATE(Workspaces)
                    .set({
                        CompanyName: companyName,
                        Address: address,
                        Phone: phone,
                        Email: email
                    })
                    .where({ ID: user.attr.workspaceID })
            );

            await tx.commit();

            console.log('✅ Workspace info updated successfully');

            return {
                success: true,
                message: 'Workspace information updated successfully'
            };

        } catch (error) {
            console.error('❌ Error in updateWorkspaceInfo:', error);
            await tx.rollback();
            req.error(500, `Failed to update workspace info: ${error.message}`);
        }
    }));

    // ===== USER PROFILE ACTIONS (Authenticated users) =====

    /**
     * Get user profile (Authenticated users)
     */
    srv.on('getUserProfile', async (req) => {
        const user = req.user;

        if (!user) {
            req.error(401, 'Authentication required');
            return;
        }

        try {
            const userProfile = await SELECT.one.from(Users)
                .where({ Username: user.username })
                .columns(['ID', 'Username', 'Role', 'FullName', 'Email', 'Phone', 'Status', 'WorkspaceID']);

            console.log('✅ Retrieved user profile for:', user.username);

            return userProfile;

        } catch (error) {
            console.error('❌ Error in getUserProfile:', error);
            req.error(500, `Failed to get user profile: ${error.message}`);
        }
    });

    /**
     * Update user profile (Authenticated users)
     */
    srv.on('updateUserProfile', async (req) => {
        const { fullName, email, phone } = req.data;
        const user = req.user;
        const tx = cds.transaction(req);

        if (!user) {
            req.error(401, 'Authentication required');
            return;
        }

        try {
            await tx.run(
                UPDATE(Users)
                    .set({
                        FullName: fullName,
                        Email: email,
                        Phone: phone
                    })
                    .where({ Username: user.username })
            );

            await tx.commit();

            console.log('✅ User profile updated successfully for:', user.username);

            return {
                success: true,
                message: 'Profile updated successfully'
            };

        } catch (error) {
            console.error('❌ Error in updateUserProfile:', error);
            await tx.rollback();
            req.error(500, `Failed to update profile: ${error.message}`);
        }
    });

    /**
     * Get workspace info (Authenticated users)
     */
    srv.on('getWorkspaceInfo', async (req) => {
        const user = req.user;

        if (!user) {
            req.error(401, 'Authentication required');
            return;
        }

        try {
            const workspace = await WorkspaceSecurity.getUserWorkspace(req);

            if (!workspace) {
                return {
                    success: false,
                    message: 'User does not belong to any workspace'
                };
            }

            console.log('✅ Retrieved workspace info for user:', user.username);

            return workspace;

        } catch (error) {
            console.error('❌ Error in getWorkspaceInfo:', error);
            req.error(500, `Failed to get workspace info: ${error.message}`);
        }
    });

    /**
     * Change password (Authenticated users)
     */
    srv.on('changePassword', async (req) => {
        const { currentPassword, newPassword } = req.data;
        const user = req.user;
        const tx = cds.transaction(req);

        if (!user) {
            req.error(401, 'Authentication required');
            return;
        }

        try {
            // Get current user data
            const userData = await tx.run(
                SELECT.one.from(Users).where({ Username: user.username })
            );

            if (!userData) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Verify current password
            const isCurrentPasswordValid = await comparePassword(currentPassword, userData.Password);
            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    message: 'Current password is incorrect'
                };
            }

            // Validate new password
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    message: passwordValidation.message
                };
            }

            // Hash and update new password
            const hashedNewPassword = await hashPassword(newPassword);
            await tx.run(
                UPDATE(Users)
                    .set({ Password: hashedNewPassword })
                    .where({ Username: user.username })
            );

            await tx.commit();

            console.log('✅ Password changed successfully for user:', user.username);

            return {
                success: true,
                message: 'Password changed successfully'
            };

        } catch (error) {
            console.error('❌ Error in changePassword:', error);
            await tx.rollback();
            req.error(500, `Failed to change password: ${error.message}`);
        }
    });

    /**
     * Logout (Authenticated users)
     */
    srv.on('logout', async (req) => {
        const user = req.user;

        if (!user) {
            req.error(401, 'Authentication required');
            return;
        }

        console.log('✅ User logged out:', user.username);

        return {
            success: true,
            message: 'Logged out successfully'
        };
    });

    // ===== PERMISSION INFO ACTION =====

    /**
     * Get user permissions and info (Authenticated users)
     */
    srv.on('getUserPermissions', async (req) => {
        const user = req.user;

        if (!user) {
            req.error(401, 'Authentication required');
            return;
        }

        try {
            const permissions = PermissionMiddleware.getPermissionSummary(user.role);
            const workspace = await WorkspaceSecurity.getUserWorkspace(req);

            console.log('✅ Retrieved permissions for user:', user.username);

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

        } catch (error) {
            console.error('❌ Error in getUserPermissions:', error);
            req.error(500, `Failed to get user permissions: ${error.message}`);
        }
    });

    // ===== INITIALIZE SECURITY =====
    console.log('🔧 Initializing UserService security...');
    
    // Apply workspace filtering and permission checks
    ServiceIntegrator.initializeServiceSecurity(srv, 'user');
    
    console.log('✅ UserService security initialization completed');
};