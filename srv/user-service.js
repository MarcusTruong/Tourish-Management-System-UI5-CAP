const cds = require('@sap/cds');
const {message} = require('@sap/cds/lib/log/cds-error');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Khóa bí mật để ký JWT (nên lưu trong biến môi trường trong thực tế)
const JWT_SECRET = 'your-secret-key-12345'; // Thay bằng giá trị an toàn trong thực tế
const TOKEN_EXPIRY = '1h';
// Thời gian hết hạn của token (1 giờ)

// Hàm mã hóa mật khẩu
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// Hàm kiểm tra mật khẩu
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Hàm kiểm tra độ phức tạp của mật khẩu
const validatePasswordComplexity = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length<minLength) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true, message: 'Password is valid' };
};

// Hàm tạo JWT
const generateToken = (user) => {
        const payload = {
            id: user.ID,
            username: user.Username,
            role: user.Role
        };
        return jwt.sign(payload, JWT_SECRET, {expiresIn: TOKEN_EXPIRY});
    };

    module.exports = cds.service.impl(async function () {
        const {Workspaces, Users} = this.entities;

        // Handler cho createUser (đăng ký user mới)
        this.on('createUser', async (req) => {
            console.log('>>> createUser handler called with data:', req.data);
            const {
                username,
                password,
                fullName,
                email,
                phone
            } = req.data;
            const tx = cds.transaction(req);

            try { // Kiểm tra xem username đã tồn tại chưa
                const existingUser = await tx.run(SELECT.one.from(Users).where({Username: username}));
                if (existingUser) {
                    req.error(409, `Username ${username} already exists`);
                    return;
                }

                const passwordValidation = validatePasswordComplexity(password);
                if (! passwordValidation.valid) {
                    return {success: false, message: passwordValidation.message};
                }

                const hashedPassword = await hashPassword(password);
                const user = {
                    ID: cds.utils.uuid(),
                    WorkspaceID: null, // User mới đăng ký chưa thuộc workspace nào
                    Username: username,
                    Password: hashedPassword,
                    Role: 'Admin', // Role mặc định là Admin khi đăng ký
                    FullName: fullName,
                    Email: email,
                    Phone: phone,
                    Status: 'Active'
                };
                await tx.run(INSERT.into(Users).entries(user));
                const createdUser = await tx.run(SELECT.one.from(Users).where({ID: user.ID}));
                await tx.commit();
                console.log('>>> User registered successfully:', createdUser);
                return {
                    ID: createdUser.ID,
                    WorkspaceID: createdUser.WorkspaceID,
                    Username: createdUser.Username,
                    Password: createdUser.Password,
                    Role: createdUser.Role,
                    FullName: createdUser.FullName,
                    Email: createdUser.Email,
                    Phone: createdUser.Phone
                };
            } catch (error) {
                console.error('>>> Error in createUser:', error);
                await tx.rollback();
                req.error(500, `Failed to create user: ${
                    error.message
                }`);
            }
        });

        // Handler cho authenticate (đăng nhập)
        this.on('authenticate', async (req) => {
            console.log('>>> authenticate handler called with data:', req.data);
            const {username, password} = req.data;

            try {
                const user = await SELECT.one.from(Users).where({Username: username});
                if (! user) {
                    console.log('>>> Authentication failed: User not found for username:', username);
                    return {success: false, user: null, token: null, message: 'Incorrect Username and password'};
                }
                const isPasswordValid = await comparePassword(password, user.Password);
                if (! isPasswordValid) {
                    console.log('>>> Authentication failed: Incorrect password for username:', username);
                    return {success: false, user: null, token: null, message: 'Incorrect Username and password'};
                }
                const token = generateToken(user);
                console.log('>>> Authentication successful for username:', username);
                return {
                    success: true,
                    user: {
                        ID: user.ID,
                        Username: user.Username,
                        Role: user.Role,
                        FullName: user.FullName,
                        Email: user.Email,
                        Phone: user.Phone,
                        Status: user.Status
                    },
                    token: token
                };
            } catch (error) {
                console.error('>>> Error in authenticate:', error);
                req.error(500, `Failed to authenticate: ${
                    error.message
                }`);
            }
        });

        // Handler cho createWorkspace
        this.on('createWorkspace', async (req) => {
            console.log('>>> createWorkspace handler called with data:', req.data);
            const {companyName, address, phone, email} = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu (mock user hoặc JWT payload)
                const user = req.user; // Trong môi trường mock, req.user được gán từ Authorization
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    req.error(401, `Unauthorized: User information not found in request`);
                    return;
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    req.error(404, `User with ID ${
                        user.id
                    } not found`);
                    return;
                }
                if (adminUser.Role !== 'Admin') {
                    req.error(403, `User ${
                        user.id
                    } does not have Admin role`);
                    return;
                }
                if (adminUser.WorkspaceID) {
                    req.error(400, `User ${
                        user.id
                    } already has an assigned workspace`);
                    return;
                }

                // Tạo workspace
                const workspace = {
                    ID: cds.utils.uuid(),
                    CompanyName: companyName,
                    Address: address,
                    Phone: phone,
                    Email: email
                };
                await tx.run(INSERT.into(Workspaces).entries(workspace));

                // Cập nhật WorkspaceID cho Admin
                await tx.run(UPDATE(Users).set({WorkspaceID: workspace.ID}).where({ID: adminUser.ID}));

                const createdWorkspace = await tx.run(SELECT.one.from(Workspaces).where({ID: workspace.ID}));
                await tx.commit();
                console.log('>>> Workspace created successfully:', createdWorkspace);
                console.log('>>> Admin user updated with WorkspaceID:', adminUser.ID, workspace.ID);
                return {
                    ID: createdWorkspace.ID,
                    CompanyName: createdWorkspace.CompanyName,
                    Address: createdWorkspace.Address,
                    Phone: createdWorkspace.Phone,
                    Email: createdWorkspace.Email
                };
            } catch (error) {
                console.error('>>> Error in createWorkspace:', error);
                await tx.rollback();
                req.error(500, `Failed to create workspace: ${
                    error.message
                }`);
            }
        });

        // Handler cho addUser (Admin thêm user vào workspace)
        this.on('addUser', async (req) => {
            console.log('>>> addUser handler called with data:', req.data);
            const {
                username,
                password,
                role,
                fullName,
                email,
                phone
            } = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu (mock user hoặc JWT payload)
                const user = req.user; // Trong môi trường mock, req.user được gán từ Authorization
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    req.error(401, `Unauthorized: User information not found in request`);
                    return;
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    req.error(404, `Admin user with ID ${
                        user.id
                    } not found`);
                    return;
                }
                if (adminUser.Role !== 'Admin') {
                    req.error(403, `User ${
                        user.id
                    } does not have Admin role`);
                    return;
                }

                // Lấy workspaceID từ Admin
                const workspaceID = adminUser.WorkspaceID;
                if (! workspaceID) {
                    req.error(403, `Admin ${
                        user.id
                    } does not belong to any workspace`);
                    return;
                }

                // Kiểm tra sự tồn tại của workspace
                const workspace = await tx.run(SELECT.one.from(Workspaces).where({ID: workspaceID}));
                if (! workspace) {
                    req.error(404, `Workspace with ID ${workspaceID} not found`);
                    return;
                }

                // Kiểm tra xem username đã tồn tại chưa
                const existingUser = await tx.run(SELECT.one.from(Users).where({Username: username}));
                if (existingUser) {
                    req.error(409, `Username ${username} already exists`);
                    return;
                }

                const hashedPassword = await hashPassword(password);
                const newUser = {
                    ID: cds.utils.uuid(),
                    WorkspaceID: workspaceID, // Gán user vào workspace của Admin
                    Username: username,
                    Password: hashedPassword,
                    Role: role,
                    FullName: fullName,
                    Email: email,
                    Phone: phone,
                    Status: 'Active'
                };
                await tx.run(INSERT.into(Users).entries(newUser));
                const createdUser = await tx.run(SELECT.one.from(Users).where({ID: newUser.ID}));
                await tx.commit();
                console.log('>>> User added to workspace successfully:', createdUser);
                return {
                    ID: createdUser.ID,
                    WorkspaceID: createdUser.WorkspaceID,
                    Username: createdUser.Username,
                    Password: createdUser.Password,
                    Role: createdUser.Role,
                    FullName: createdUser.FullName,
                    Email: createdUser.Email,
                    Phone: createdUser.Phone,
                    Status: createdUser.Status
                };
            } catch (error) {
                console.error('>>> Error in addUser:', error);
                await tx.rollback();
                req.error(500, `Failed to add user: ${
                    error.message
                }`);
            }
        });

        // Handler cho updateUserPermissions
        this.on('updateUserPermissions', async (req) => {
            console.log('>>> updateUserPermissions handler called with data:', req.data);
            const {userID, role} = req.data;
            const tx = cds.transaction(req);

            try {
                const user = await tx.run(SELECT.one.from(Users).where({ID: userID}));
                if (! user) {
                    req.error(404, `User with ID ${userID} not found`);
                    return;
                }
                await tx.run(UPDATE(Users).set({Role: role}).where({ID: userID}));
                const updatedUser = await tx.run(SELECT.one.from(Users).where({ID: userID}));
                await tx.commit();
                console.log('>>> User permissions updated successfully:', updatedUser);
                return {
                    ID: updatedUser.ID,
                    WorkspaceID: updatedUser.WorkspaceID,
                    Username: updatedUser.Username,
                    Password: updatedUser.Password,
                    Role: updatedUser.Role,
                    FullName: updatedUser.FullName,
                    Email: updatedUser.Email,
                    Phone: updatedUser.Phone,
                    Status: updatedUser.Status
                };
            } catch (error) {
                console.error('>>> Error in updateUserPermissions:', error);
                await tx.rollback();
                req.error(500, `Failed to update user permissions: ${
                    error.message
                }`);
            }
        });

        // Handler cho changePassword
        this.on('changePassword', async (req) => {
            console.log('>>> changePassword handler called with data:', req.data);
            const {currentPassword, newPassword} = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu (mock user hoặc JWT payload)
                const user = req.user; // Trong môi trường mock, req.user được gán từ Authorization
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    return {success: false, message: `Unauthorized: User information not found in request`};
                }

                // Kiểm tra user tồn tại
                const currentUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                console.log(currentUser)
                if (! currentUser) {
                    return {
                            success: false, message: `User with ID ${
                            user.id
                        } not found`
                    };
                }
                console.log(currentPassword);
                console.log(currentUser.Password);
                // So sánh mật khẩu hiện tại
                const isPasswordValid = await comparePassword(currentPassword, currentUser.Password);
                console.log(isPasswordValid);
                if (! isPasswordValid) {
                    return {success: false, message: `Current password is incorrect`};
                }

                // Kiểm tra độ phức tạp của mật khẩu mới
                const passwordValidation = validatePasswordComplexity(newPassword);
                if (! passwordValidation.valid) {
                    return {success: false, message: passwordValidation.message};
                }

                // Mã hóa mật khẩu mới và cập nhật
                const hashedNewPassword = await hashPassword(newPassword);
                await tx.run(UPDATE(Users).set({Password: hashedNewPassword}).where({Username: user.id}));
                await tx.commit();
                console.log('>>> Password changed successfully for user:', user.id);
                return {success: true, message: 'Password changed successfully'};
            } catch (error) {
                console.error('>>> Error in changePassword:', error);
                await tx.rollback();
                return {
                        success: false, message: `Failed to change password: ${
                        error.message
                    }`
                };
            }
        });

        // Handler cho getWorkspaceMembers (Admin xem danh sách thành viên trong workspace)
        this.on('getWorkspaceMembers', async (req) => {
            console.log('>>> getWorkspaceMembers handler called');
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu (mock user hoặc JWT payload)
                const user = req.user; // Trong môi trường mock, req.user được gán từ Authorization
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    req.error(401, `Unauthorized: User information not found in request`);
                    return;
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    req.error(404, `Admin user with ID ${
                        user.id
                    } not found`);
                    return;
                }
                if (adminUser.Role !== 'Admin') {
                    req.error(403, `User ${
                        user.id
                    } does not have Admin role`);
                    return;
                }

                // Lấy workspaceID từ Admin
                const workspaceID = adminUser.WorkspaceID;
                if (! workspaceID) {
                    req.error(403, `Admin ${
                        user.id
                    } does not belong to any workspace`);
                    return;
                }

                // Truy vấn danh sách user thuộc workspace
                const members = await tx.run(SELECT.from(Users).where({WorkspaceID: workspaceID}).columns('ID', 'Username', 'Role', 'FullName', 'Email', 'Phone', 'Status'));

                console.log('>>> Members retrieved successfully:', members);
                return members;
            } catch (error) {
                console.error('>>> Error in getWorkspaceMembers:', error);
                req.error(500, `Failed to retrieve workspace members: ${
                    error.message
                }`);
            }
        });

        this.on('updateUserStatus', async (req) => {
            console.log('>>> updateUserStatus handler called with data:', req.data);
            const {userID, status} = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu
                const user = req.user;
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    return {success: false, message: `Unauthorized: User information not found in request`};
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    return {
                            success: false, message: `Admin user with ID ${
                            user.id
                        } not found`
                    };
                }
                if (adminUser.Role !== 'Admin') {
                    return {
                            success: false, message: `User ${
                            user.id
                        } does not have Admin role`
                    };
                }

                // Kiểm tra user cần cập nhật
                const targetUser = await tx.run(SELECT.one.from(Users).where({ID: userID}));
                if (! targetUser) {
                    return {success: false, message: `User with ID ${userID} not found`};
                }

                // Kiểm tra user thuộc cùng workspace với Admin
                if (targetUser.WorkspaceID !== adminUser.WorkspaceID) {
                    return {success: false, message: `User ${userID} does not belong to Admin's workspace`};
                }

                // Kiểm tra trạng thái hợp lệ
                if (!['Active', 'Inactive'].includes(status)) {
                    return {success: false, message: `Invalid status: ${status}. Status must be 'Active' or 'Inactive'`};
                }

                // Cập nhật trạng thái
                await tx.run(UPDATE(Users).set({Status: status}).where({ID: userID}));
                await tx.commit();
                console.log(`>>> User ${userID} status updated to ${status}`);
                return {success: true, message: `User status updated to ${status} successfully`};
            } catch (error) {
                console.error('>>> Error in updateUserStatus:', error);
                await tx.rollback();
                return {
                        success: false, message: `Failed to update user status: ${
                        error.message
                    }`
                };
            }
        });


        this.on('removeUserFromWorkspace', async (req) => {
            console.log('>>> removeUserFromWorkspace handler called with data:', req.data);
            const {userID} = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu
                const user = req.user;
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    return {success: false, message: `Unauthorized: User information not found in request`};
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    return {
                            success: false, message: `Admin user with ID ${
                            user.id
                        } not found`
                    };
                }
                if (adminUser.Role !== 'Admin') {
                    return {
                            success: false, message: `User ${
                            user.id
                        } does not have Admin role`
                    };
                }

                // Kiểm tra user cần xóa
                const targetUser = await tx.run(SELECT.one.from(Users).where({ID: userID}));
                if (! targetUser) {
                    return {success: false, message: `User with ID ${userID} not found`};
                }

                // Kiểm tra user thuộc cùng workspace với Admin
                if (targetUser.WorkspaceID !== adminUser.WorkspaceID) {
                    return {success: false, message: `User ${userID} does not belong to Admin's workspace`};
                }

                // Không cho phép Admin tự xóa mình khỏi workspace
                if (targetUser.ID === adminUser.ID) {
                    return {success: false, message: `Admin cannot remove themselves from the workspace`};
                }

                // Xóa user khỏi workspace (đặt WorkspaceID về null)
                await tx.run(UPDATE(Users).set({WorkspaceID: null}).where({ID: userID}));
                await tx.commit();
                console.log(`>>> User ${userID} removed from workspace ${
                    adminUser.WorkspaceID
                }`);
                return {success: true, message: `User removed from workspace successfully`};
            } catch (error) {
                console.error('>>> Error in removeUserFromWorkspace:', error);
                await tx.rollback();
                return {
                        success: false, message: `Failed to remove user from workspace: ${
                        error.message
                    }`
                };
            }
        });


        // Handler cho getUserProfile
        this.on('getUserProfile', async (req) => {
            console.log('>>> getUserProfile handler called');
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu
                const user = req.user;
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    req.error(401, `Unauthorized: User information not found in request`);
                    return;
                }

                // Kiểm tra user tồn tại
                const currentUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}).columns('ID', 'Username', 'Role', 'FullName', 'Email', 'Phone', 'Status', 'WorkspaceID'));
                if (! currentUser) {
                    req.error(404, `User with ID ${
                        user.id
                    } not found`);
                    return;
                }

                console.log('>>> User profile retrieved successfully:', currentUser);
                return currentUser;
            } catch (error) {
                console.error('>>> Error in getUserProfile:', error);
                req.error(500, `Failed to retrieve user profile: ${
                    error.message
                }`);
            }
        });

        // Handler cho updateUserProfile
        this.on('updateUserProfile', async (req) => {
            console.log('>>> updateUserProfile handler called with data:', req.data);
            const {fullName, email, phone} = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu
                const user = req.user;
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    return {success: false, message: `Unauthorized: User information not found in request`};
                }

                // Kiểm tra user tồn tại
                const currentUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! currentUser) {
                    return {
                            success: false, message: `User with ID ${
                            user.id
                        } not found`
                    };
                }

                // Cập nhật thông tin
                await tx.run(UPDATE(Users).set({FullName: fullName, Email: email, Phone: phone}).where({Username: user.id}));
                await tx.commit();
                console.log('>>> User profile updated successfully for user:', user.id);
                return {success: true, message: 'User profile updated successfully'};
            } catch (error) {
                console.error('>>> Error in updateUserProfile:', error);
                await tx.rollback();
                return {
                        success: false, message: `Failed to update user profile: ${
                        error.message
                    }`
                };
            }
        });

        // Handler cho getWorkspaceInfo
        this.on('getWorkspaceInfo', async (req) => {
            console.log('>>> getWorkspaceInfo handler called');
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu
                const user = req.user;
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    req.error(401, `Unauthorized: User information not found in request`);
                    return;
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    req.error(404, `Admin user with ID ${
                        user.id
                    } not found`);
                    return;
                }

                // Lấy workspaceID từ Admin
                const workspaceID = adminUser.WorkspaceID;
                if (! workspaceID) {
                    req.error(403, `User ${
                        user.id
                    } does not belong to any workspace`);
                    return;
                }

                // Truy vấn thông tin workspace
                const workspace = await tx.run(SELECT.one.from(Workspaces).where({ID: workspaceID}).columns('ID', 'CompanyName', 'Address', 'Phone', 'Email'));
                if (! workspace) {
                    req.error(404, `Workspace with ID ${workspaceID} not found`);
                    return;
                }

                console.log('>>> Workspace info retrieved successfully:', workspace);
                return workspace;
            } catch (error) {
                console.error('>>> Error in getWorkspaceInfo:', error);
                req.error(500, `Failed to retrieve workspace info: ${
                    error.message
                }`);
            }
        });

        // Handler cho updateWorkspaceInfo
        this.on('updateWorkspaceInfo', async (req) => {
            console.log('>>> updateWorkspaceInfo handler called with data:', req.data);
            const {companyName, address, phone, email} = req.data;
            const tx = cds.transaction(req);

            try { // Lấy thông tin user từ yêu cầu
                const user = req.user;
                console.log('>>> Current user:', user);
                if (! user || ! user.id) {
                    return {success: false, message: `Unauthorized: User information not found in request`};
                }

                // Kiểm tra user tồn tại và có role Admin
                const adminUser = await tx.run(SELECT.one.from(Users).where({Username: user.id}));
                if (! adminUser) {
                    return {
                            success: false, message: `Admin user with ID ${
                            user.id
                        } not found`
                    };
                }
                if (adminUser.Role !== 'Admin') {
                    return {
                            success: false, message: `User ${
                            user.id
                        } does not have Admin role`
                    };
                }

                // Lấy workspaceID từ Admin
                const workspaceID = adminUser.WorkspaceID;
                if (! workspaceID) {
                    return {
                            success: false, message: `Admin ${
                            user.id
                        } does not belong to any workspace`
                    };
                }

                // Kiểm tra sự tồn tại của workspace
                const workspace = await tx.run(SELECT.one.from(Workspaces).where({ID: workspaceID}));
                if (! workspace) {
                    return {success: false, message: `Workspace with ID ${workspaceID} not found`};
                }

                // Cập nhật thông tin workspace
                await tx.run(UPDATE(Workspaces).set({CompanyName: companyName, Address: address, Phone: phone, Email: email}).where({ID: workspaceID}));
                await tx.commit();
                console.log('>>> Workspace info updated successfully for workspace:', workspaceID);
                return {success: true, message: 'Workspace info updated successfully'};
            } catch (error) {
                console.error('>>> Error in updateWorkspaceInfo:', error);
                await tx.rollback();
                return {
                        success: false, message: `Failed to update workspace info: ${
                        error.message
                    }`
                };
            }
        });


        // Handler cho logout
        this.on('logout', async (req) => {
            console.log('>>> logout handler called');
            const user = req.user;
            console.log('>>> Current user:', user);
            if (! user || ! user.id) {
                return {success: false, message: `Unauthorized: User information not found in request`};
            }

            // Trong môi trường mock, chỉ trả về thông báo
            // Trong thực tế, có thể thêm token vào danh sách đen (blacklist) để vô hiệu hóa
            console.log('>>> User logged out successfully:', user.id);
            return {success: true, message: 'Logged out successfully'};
        });
    });
