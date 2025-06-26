export interface RegisteredRoute {
  method: string;
  path: string;
  secure: boolean;
  source: string; // controller filename or source info
}

/**
 * Registry that tracks all routes for validation and reporting.
 */
export class RouteRegistry {
  private readonly routes: RegisteredRoute[] = [];

  register(route: RegisteredRoute): void {
    this.routes.push(route);
  }

  /**
   * Returns a list of registered routes sorted by path specificity.
   */
  getSorted(): RegisteredRoute[] {
    return [...this.routes].sort((a, b) => {
      // Static before dynamic, then by length
      const aScore = this.scorePath(a.path);
      const bScore = this.scorePath(b.path);
      return bScore - aScore;
    });
  }

  /**
   * Detects potential route conflicts.
   * For now: naive match on same method + static path vs dynamic overlap.
   */
  detectConflicts(): string[] {
    const conflicts: string[] = [];
    const byMethod = new Map<string, RegisteredRoute[]>();

    for (const route of this.routes) {
      const list = byMethod.get(route.method) || [];
      for (const existing of list) {
        if (this.possiblyConflicting(route.path, existing.path)) {
          conflicts.push(
            `Possible conflict: [${route.method.toUpperCase()}] ${route.path} <-> ${existing.path}`
          );
        }
      }
      list.push(route);
      byMethod.set(route.method, list);
    }

    return conflicts;
  }

  public getRoutes(): RegisteredRoute[] {
    return [...this.routes];
  }

  /**
   * Scores a path by static segments.
   */
  private scorePath(path: string): number {
    const segments = path.split('/').filter(Boolean);
    let score = 0;
    for (const seg of segments) {
      if (seg.startsWith(':'))
        score -= 1; // dynamic
      else score += 2; // static
    }
    return score;
  }

  /**
   * Very simple heuristic for overlapping routes.
   */
  private possiblyConflicting(a: string, b: string): boolean {
    return a === b || (a.includes('/:') && b.startsWith(a.split('/:')[0]));
  }
}
