import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Định dạng SĐT Việt Nam hợp lệ: 0[3|5|7|8|9]xxxxxxxx hoặc +84[3|5|7|8|9]xxxxxxxx.
 */
const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[25689]|7[0678]|8[1-9]|9[0-9])\d{7}$/;

export function IsVietnamesePhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isVietnamesePhoneNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && VN_PHONE_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số điện thoại Việt Nam hợp lệ (VD: 0912345678 hoặc +84912345678)!`;
        },
      },
    });
  };
}
