import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwksService } from './jwks.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwks: JwksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.isPublicRoute(context);
    if (isPublicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.getAccessToken(request);
    const claims = await this.jwks.verify(accessToken);

    request.user = this.createAuthenticatedUser(claims as Record<string, unknown>);
    return true;
  }

  private isPublicRoute(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? false;
  }

  private getAccessToken(request: AuthenticatedRequest): string {
    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    return authorizationHeader.slice('Bearer '.length);
  }

  private createAuthenticatedUser(claims: Record<string, unknown>): AuthenticatedUser {
    const subject = claims.sub;
    if (typeof subject !== 'string' || subject.length === 0) {
      throw new UnauthorizedException('Token subject is missing');
    }

    return {
      id: subject,
      email: typeof claims.email === 'string' ? claims.email : undefined,
      claims,
    };
  }
}
