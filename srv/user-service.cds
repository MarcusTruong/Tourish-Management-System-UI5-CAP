using tourish.management as tm from '../db/schema';

service UserService @(path: '/user-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Workspaces as projection on tm.Workspace;
  entity Users as projection on tm.User;

  // action dang ki 
  action createUser(
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
  };

  // Action để tạo Workspace
  @(requires: 'admin')
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
  @(requires: 'admin')
  action addUser(
    workspaceID: UUID,
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
  @(requires: 'admin')
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
    userID: UUID,
    currentPassword: String,
    newPassword: String
  ) returns Boolean;

  // Action để xác thực
  action authenticate(
    username: String,
    password: String
  ) returns {
    success: Boolean;
    user: {
      ID: UUID;
      Username: String(50);
      Role: String(20);
      FullName: String(100);
      Email: String(100);
      Phone: String(20);
      Status: String(20);
    };
    token: String;
  };
}