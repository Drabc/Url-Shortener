export interface IJwtIssuer {
  issue(userId: string): Promise<string>
}
