import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { PASSWORD_POLICY_MESSAGE, isValidPassword } from './password-policy';

export interface SignupDto {
  email: string;
  password: string;
}

@Injectable()
export class SignupValidationPipe implements PipeTransform<unknown, SignupDto> {
  transform(value: unknown): SignupDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const body = value as Record<string, unknown>;
    const email = body.email;
    const password = body.password;

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    if (typeof password !== 'string' || !isValidPassword(password)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }

    return { email: email.trim().toLowerCase(), password };
  }
}
