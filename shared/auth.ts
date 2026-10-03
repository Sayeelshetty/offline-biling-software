export type UserRole =
  | "ADMIN"
  | "CASHIER"
  | "MANAGER";

export type AuthenticatedUser = {
  id: string;
  serverId: string | null;
  businessId: string | null;
  name: string;
  email: string | null;
  role: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  businessId?: string | null;
};

export type UserRecord = AuthenticatedUser & {
  createdAt: string;
  updatedAt: string;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  deviceId: string;
};