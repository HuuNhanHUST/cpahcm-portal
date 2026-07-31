import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validate field hiện tại (nếu có giá trị) phải LỚN HƠN giá trị của 1 field khác trên cùng
 * object — dùng cho Course.originalPrice > Course.price (giá gốc gạch ngang phải lớn hơn giá
 * bán, tránh Admin nhập ngược khiến UI hiển thị "giảm giá âm").
 */
export function IsGreaterThanField(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThanField',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) return true; // field tùy chọn — không set thì bỏ qua
          const [relatedProperty] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedProperty
          ];
          if (relatedValue === undefined || relatedValue === null) return true;
          return Number(value) > Number(relatedValue);
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty] = args.constraints;
          return `${args.property} phải lớn hơn ${relatedProperty}!`;
        },
      },
    });
  };
}
