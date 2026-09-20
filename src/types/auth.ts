export interface JwtClaims {
    tenant_id: string;
    investor_id: string;
    iat?: number;
    exp?: number;
}