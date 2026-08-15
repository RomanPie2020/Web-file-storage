import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

@Injectable()
export class JwksService {
  private keySet?: ReturnType<typeof createRemoteJWKSet>;
  private keySetUrl?: string;

  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<JWTPayload> {
    const jwksUrl = this.config.getOrThrow<string>('SUPABASE_JWKS_URL');
    if (!this.keySet || this.keySetUrl !== jwksUrl) {
      this.keySet = createRemoteJWKSet(new URL(jwksUrl));
      this.keySetUrl = jwksUrl;
    }
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        issuer: this.config.get<string>('SUPABASE_JWT_ISSUER'),
        audience: this.config.get<string>('SUPABASE_JWT_AUDIENCE', 'authenticated'),
      });
      if (!payload.sub) throw new UnauthorizedException('Token subject is missing');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
