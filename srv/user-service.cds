using tourish.management as tm from '../db/schema';

service UserService @(path: '/user-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Workspaces as projection on tm.Workspace;
  entity Users as projection on tm.User;

  // ===== PUBLIC ACTIONS =====
  
  // Action đăng ký user mới
  action createUser(
    username: String,
    password: String,
    fullName: String,
    email: String,
    phone: String
  ) returns {
    ID: UUID; 
    WorkspaceID: UUID;
    Username: String(50); 
    Role: String(20); 
    FullName: String(100); 
    Email: String(100); 
    Phone: String(20);
    Status: String(20);
  };

  // Action xác thực đăng nhập
  action authenticate(
    username: String,
    password: String
  ) returns {
    success: Boolean;
    user: {
      ID: UUID;
      WorkspaceID: UUID;
      Username: String(50);
      Role: String(20);
      FullName: String(100);
      Email: String(100);
      Phone: String(20);
      Status: String(20);
    };
    token: String;
    permissions: {
      role: String;
      canManageUsers: Boolean;
      canManageWorkspace: Boolean;
      canManageTours: Boolean;
      canManageOrders: Boolean;
      canManageFinance: Boolean;
      canViewReports: Boolean;
    };
    message: String;
  };

  // ===== ADMIN ONLY ACTIONS =====

  // Action để tạo Workspace (Admin only)
  @(requires: 'Admin')
  action createWorkspace(
    companyName: String,
    address: String,
    phone: String,
    email: String
  ) returns {
    ID: UUID;
    CompanyName: String(100);
    Address: String(200);
    Phone: String(20);
    Email: String(100);
  };

  // Action để thêm User vào Workspace (Admin only)
  @(requires: 'Admin')
  action addUser(
    username: String,
    password: String,
    role: String,
    fullName: String,
    email: String,
    phone: String
  ) returns {
    ID: UUID;
    WorkspaceID: UUID;
    Username: String(50);
    Password: String(100);
    Role: String(20);
    FullName: String(100);
    Email: String(100);
    Phone: String(20);
    Status: String(20);
  };

  // Action để cập nhật quyền của User (Admin only)
  @(requires: 'Admin')
  action updateUserPermissions(
    userID: UUID,
    role: String  
  ) returns {
    ID: UUID;
    WorkspaceID: UUID;
    Username: String(50);
    Password: String(100);
    Role: String(20);
    FullName: String(100);
    Email: String(100);
    Phone: String(20);
    Status: String(20);
  };

  // Action để Admin update status user (Admin only)
  @(requires: 'Admin')
  action updateUserStatus(
    userID: UUID,
    status: String(20)
  ) returns {
    success: Boolean;
    message: String;
  };

  // Action để Admin xóa thành viên khỏi workspace (Admin only)
  @(requires: 'Admin')
  action removeUserFromWorkspace(
    userID: UUID
  ) returns {
    success: Boolean;
    message: String;
  };

  // Action để Admin xem danh sách thành viên trong workspace (Admin only)
  @(requires: 'Admin')
  action getWorkspaceMembers() returns array of {
    ID: UUID;
    Username: String(50);
    Role: String(20);
    FullName: String(100);
    Email: String(100);
    Phone: String(20);
    Status: String(20);
  };

  // Action để Admin cập nhật thông tin workspace (Admin only)
  @(requires: 'Admin')
  action updateWorkspaceInfo(
    companyName: String,
    address: String,
    phone: String,
    email: String
  ) returns {
    success: Boolean;
    message: String;
  };

  // ===== AUTHENTICATED USER ACTIONS =====

  // Action để user xem profile của mình
  @(requires: 'authenticated-user')
  action getUserProfile() returns {
    ID: UUID;
    Username: String(50);
    Role: String(20);
    FullName: String(100);
    Email: String(100);
    Phone: String(20);
    Status: String(20);
    WorkspaceID: UUID;
  };

  // Action để user cập nhật profile của mình
  @(requires: 'authenticated-user')
  action updateUserProfile(
    fullName: String,
    email: String,
    phone: String
  ) returns {
    success: Boolean;
    message: String;
  };

  // Action để user xem thông tin workspace
  @(requires: 'authenticated-user')
  action getWorkspaceInfo() returns {
    ID: UUID;
    CompanyName: String(100);
    Address: String(200);
    Phone: String(20);
    Email: String(100);
  };

  // Action để đổi mật khẩu
  @(requires: 'authenticated-user')
  action changePassword(
    currentPassword: String,
    newPassword: String
  ) returns {
    success: Boolean;
    message: String;
  };

  // Action để đăng xuất
  @(requires: 'authenticated-user')
  action logout() returns {
    success: Boolean;
    message: String;
  };

  // ===== PERMISSION INFO ACTION =====

  // Action để lấy thông tin permissions của user hiện tại
  @(requires: 'authenticated-user')
  action getUserPermissions() returns {
    user: {
      username: String;
      role: String;
      fullName: String;
      email: String;
    };
    workspace: {
      id: UUID;
      companyName: String;
      address: String;
    };
    permissions: {
      role: String;
      canManageUsers: Boolean;
      canManageWorkspace: Boolean;
      canManageTours: Boolean;
      canManageOrders: Boolean;
      canManageFinance: Boolean;
      canViewReports: Boolean;
      fullPermissions: {
        workspace: array of String;
        user: array of String;
        tour: array of String;
        customer: array of String;
        order: array of String;
        payment: array of String;
        supplier: array of String;
        finance: array of String;
      };
    };
    isWorkspaceAdmin: Boolean;
  };
}