using tourish.management as tm from '../db/schema';

service UserService @(path: '/user-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Workspaces as projection on tm.Workspace;
  entity Users as projection on tm.User;

  // action dang ki 
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
    Password: String(100); 
    Role: String(20); 
    FullName: String(100); 
    Email: String(100); 
    Phone: String(20);
  };

  // Action để tạo Workspace
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

  // Action để thêm User vào Workspace
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

  // Action để cập nhật quyền của User
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

  // Action để đổi mật khẩu
  @(requires: 'authenticated-user')
  action changePassword(
    currentPassword: String,
    newPassword: String
  ) returns {
    success: Boolean;
    message: String;
  };

  // Action để xác thực
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
  };

  @(requires: 'authenticated-user')
  action logout() returns {
    success: Boolean;
    message: String;
  };

    // Action để Admin xem danh sách thành viên trong workspace của mình
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
  // Action để Admin update status user
  @(requires: 'Admin')
  action updateUserStatus(
    userID: UUID,
    status: String(20)
  ) returns {
    success: Boolean;
    message: String;
  };
  // Action để Admin xóa thành viên khỏi workspace
  @(requires: 'Admin')
  action removeUserFromWorkspace(
    userID: UUID
  ) returns {
    success: Boolean;
    message: String;
};

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

@(requires: 'authenticated-user')
action updateUserProfile(
  fullName: String,
  email: String,
  phone: String
) returns {
  success: Boolean;
  message: String;
};

@(requires: 'authenticated-user')
action getWorkspaceInfo() returns {
  ID: UUID;
  CompanyName: String(100);
  Address: String(200);
  Phone: String(20);
  Email: String(100);
};

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
}