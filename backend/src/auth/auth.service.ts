import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { SignupDto } from './signup.dto';

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async signup(input: SignupDto) {
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');

    if (!url || !anonKey) {
      throw new BadRequestException('Authentication is not configured');
    }

    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { user: data.user, session: data.session };
  }
}
