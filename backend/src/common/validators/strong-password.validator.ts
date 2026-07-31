import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Toàn bộ chuỗi phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt,
 * và chỉ gồm các ký tự thuộc charset cho phép (không khoảng trắng/unicode lạ).
 */
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && STRONG_PASSWORD_REGEX.test(value);
        },
        defaultMessage() {
          return 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt (@$!%*?&) và không chứa khoảng trắng!';
        },
      },
    });
  };
}
