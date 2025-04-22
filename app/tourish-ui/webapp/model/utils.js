sap.ui.define([], function () {
  "use strict";

  return {
    validatePasswordComplexity: function (password) {
      const requirements = {
        minLength: { met: password.length >= 8, message: "Mật khẩu phải dài ít nhất 8 ký tự" },
        hasUpperCase: { met: /[A-Z]/.test(password), message: "Mật khẩu phải chứa ít nhất một chữ cái in hoa" },
        hasLowerCase: { met: /[a-z]/.test(password), message: "Mật khẩu phải chứa ít nhất một chữ cái thường" },
        hasNumber: { met: /[0-9]/.test(password), message: "Mật khẩu phải chứa ít nhất một số" },
        hasSpecialChar: { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: "Mật khẩu phải chứa ít nhất một ký tự đặc biệt" }
      };

      // Kiểm tra xem tất cả yêu cầu có được đáp ứng không
      const isValid = Object.values(requirements).every(req => req.met);

      return {
        valid: isValid,
        requirements: requirements
      };
    }
  };
});