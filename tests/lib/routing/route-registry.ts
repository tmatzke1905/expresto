import { RouteRegistry } from '../../../src/lib/routing/route-registry';
import type { RegisteredRoute } from '../../../src/lib/routing/route-registry';

describe('RouteRegistry', () => {
  let registry: RouteRegistry;

  beforeEach(() => {
    registry = new RouteRegistry();
  });

  it('registers and retrieves a route', () => {
    const route: RegisteredRoute = {
      method: 'get',
      path: '/api/test',
      secure: 'jwt',
      source: 'test.ts',
    };
    registry.register(route);

    const routes = registry.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0]).toEqual(route);
  });

  it('detects duplicate route', () => {
    const route: RegisteredRoute = {
      method: 'get',
      path: '/api/test',
      secure: 'none',
      source: 'a.ts',
    };
    registry.register(route);
    registry.register({ ...route, source: 'b.ts' });

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatch(/duplicate route/i);
  });

  it('treats same path with different methods as distinct', () => {
    registry.register({ method: 'get', path: '/api/data', secure: 'jwt', source: 'a.ts' });
    registry.register({ method: 'post', path: '/api/data', secure: 'jwt', source: 'b.ts' });

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(0);
    const routes = registry.getRoutes();
    expect(routes).toHaveLength(2);
  });

  it('normalizes paths when registering', () => {
    registry.register({
      method: 'get',
      path: '/api/test/',
      secure: 'jwt',
      source: 'norm.ts',
    });

    const routes = registry.getRoutes();
    expect(routes[0].path).toBe('/api/test');
  });

  it('allows same route with different security levels but still treats as conflict', () => {
    registry.register({ method: 'get', path: '/api/data', secure: 'none', source: 'a.ts' });
    registry.register({ method: 'get', path: '/api/data', secure: 'basic', source: 'b.ts' });

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(1);
  });

  it('sorts routes correctly', () => {
    registry.register({ method: 'post', path: '/b', secure: 'none', source: 'a.ts' });
    registry.register({ method: 'get', path: '/b', secure: 'jwt', source: 'b.ts' });
    registry.register({ method: 'get', path: '/a', secure: 'basic', source: 'c.ts' });

    const sorted = registry.getSorted();
    expect(sorted.map(r => `${r.method}:${r.path}`)).toEqual(['get:/a', 'get:/b', 'post:/b']);
  });

  it('returns a copy of routes array to prevent external mutation', () => {
    registry.register({ method: 'get', path: '/secure', secure: 'jwt', source: 'x.ts' });
    const routes = registry.getRoutes();
    routes.push({
      method: 'post',
      path: '/hacked',
      secure: 'none',
      source: 'evil.ts',
    } as RegisteredRoute);

    const current = registry.getRoutes();
    expect(current).toHaveLength(1);
    expect(current[0].path).toBe('/secure');
  });

  it('does not detect conflict when identical route is registered twice from same source', () => {
    const route: RegisteredRoute = {
      method: 'get',
      path: '/api/test',
      secure: 'jwt',
      source: 'controller.ts',
    };
    registry.register(route);
    registry.register(route);

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(0);
  });

  it('normalizes "." path to root "/"', () => {
    registry.register({
      method: 'get',
      path: '.',
      secure: 'none',
      source: 'dot.ts',
    });

    const routes = registry.getRoutes();
    expect(routes[0].path).toBe('/');
  });

  it('treats method and path case-insensitively when detecting conflicts', () => {
    registry.register({
      method: 'get',
      path: '/API/TEST',
      secure: 'none',
      source: 'a.ts',
    });
    registry.register({
      method: 'get',
      path: '/api/test',
      secure: 'jwt',
      source: 'b.ts',
    });

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(1);
  });

  it('treats dynamic path segments as literal when detecting conflicts', () => {
    registry.register({ method: 'get', path: '/users/:id', secure: 'jwt', source: 'user.ts' });
    registry.register({ method: 'get', path: '/users/:userId', secure: 'jwt', source: 'other.ts' });

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(1);
  });

  it('detects conflict with wildcard path', () => {
    registry.register({ method: 'get', path: '/files/*', secure: 'none', source: 'a.ts' });
    registry.register({ method: 'get', path: '/files/*', secure: 'none', source: 'b.ts' });

    const conflicts = registry.detectConflicts();
    expect(conflicts).toHaveLength(1);
  });
});
