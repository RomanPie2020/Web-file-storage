import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwksService } from './jwks.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwks: JwksService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthenticatedUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const payload = await this.jwks.verify(header.slice(7));
    request.user = { id: payload.sub as string, email: typeof payload.email === 'string' ? payload.email : undefined, claims: payload as Record<string, unknown> };
    return true;
  }
}
