export const CapPermission = {
  FORM_LONGSUBJECT: 1,
  FORM_LONGNAME: 2,
  FORM_LONGMAIL: 4,
  FORM_LONGTTEXT: 8,
  FORM_LONGLINE: 16,
  FORM_MANYLINE: 32,
  FORM_MANYANCHOR: 64,
  FORM_NONAME: 128,
  FORM_PASS: 256,
  REG_LIMIT: 512,
  REG_NGUSER: 1024,
  REG_NGWORD: 2048,
  REG_SAMBA: 4096,
  REG_NOTIMEPOST: 8192,
  REG_NOATTR: 16384,
  REG_NONINJA: 32768,
  REG_COMMAND: 65536,
  REG_NOCAPTCHA: 131072,
  REG_NOBAN: 262144,
  REG_THREADSTOP: 524288,
  REG_THREADPOOL: 1048576,
  REG_THREADDELETE: 2097152,
  REG_THREADARCHIVE: 4194304,
  REG_NOHOST: 8388608,
  REG_BGDSL: 16777216,
  THREAD_CAPONLY: 33554432,
  SYSADMIN: 67108864,
  SUPER: 134217728,
} as const;

export type CapPermissionValue = typeof CapPermission[keyof typeof CapPermission];

// Permission name-to-bit for building bitmasks from string-based group configs
const PERMISSION_NAME_TO_VALUE: Record<string, CapPermissionValue> = {
  "config.edit": CapPermission.SYSADMIN,
  "config.password": CapPermission.SYSADMIN,
  "users.manage": CapPermission.SYSADMIN,
  "groups.manage": CapPermission.SYSADMIN,
  "threads.stop": CapPermission.REG_THREADSTOP,
  "threads.pool": CapPermission.REG_THREADPOOL,
  "threads.delete": CapPermission.REG_THREADDELETE,
  "threads.archive": CapPermission.REG_THREADARCHIVE,
  "ngwords.manage": CapPermission.REG_NGWORD,
  "iprestrictions.manage": CapPermission.REG_NOBAN,
  "ninpocho.manage": CapPermission.REG_NONINJA,
  "logs.view": CapPermission.REG_LIMIT,
  "autodelete.manage": CapPermission.REG_BGDSL,
  "banners.manage": CapPermission.SUPER,
  "plugins.manage": CapPermission.SUPER,
  "super": CapPermission.SUPER,
  "reg.samba": CapPermission.REG_SAMBA,
  "reg.notimepost": CapPermission.REG_NOTIMEPOST,
  "reg.nguser": CapPermission.REG_NGUSER,
  "reg.ngword": CapPermission.REG_NGWORD,
  "reg.noattr": CapPermission.REG_NOATTR,
  "reg.noninja": CapPermission.REG_NONINJA,
  "reg.command": CapPermission.REG_COMMAND,
  "reg.nocaptcha": CapPermission.REG_NOCAPTCHA,
  "reg.noban": CapPermission.REG_NOBAN,
  "reg.threadstop": CapPermission.REG_THREADSTOP,
  "reg.nohost": CapPermission.REG_NOHOST,
  "reg.bgdsl": CapPermission.REG_BGDSL,
};

export const getPermissionValue = (name: string): CapPermissionValue | undefined => {
  return PERMISSION_NAME_TO_VALUE[name];
};

// String-based permission list for admin UI rendering (checkboxes, labels)
export const AVAILABLE_PERMISSIONS = [
  "config.edit",
  "config.password",
  "users.manage",
  "groups.manage",
  "threads.stop",
  "threads.pool",
  "threads.delete",
  "threads.archive",
  "ngwords.manage",
  "iprestrictions.manage",
  "ninpocho.manage",
  "logs.view",
  "autodelete.manage",
  "banners.manage",
  "plugins.manage",
  "super",
  "reg.samba",
  "reg.notimepost",
  "reg.nguser",
  "reg.ngword",
  "reg.noattr",
  "reg.noninja",
  "reg.command",
  "reg.nocaptcha",
  "reg.noban",
  "reg.threadstop",
  "reg.nohost",
] as const;

export type Permission = typeof AVAILABLE_PERMISSIONS[number];

export const hasCapPermission = (userBitmask: number, requiredPermission: CapPermissionValue): boolean => {
  if (userBitmask & CapPermission.SUPER) return true;
  return (userBitmask & requiredPermission) !== 0;
};

// Build permission bitmask from string permission names (e.g. from DB group config)
export const buildBitmask = (permissionNames: string[]): number => {
  let mask = 0;
  for (const name of permissionNames) {
    const bit = PERMISSION_NAME_TO_VALUE[name];
    if (bit) mask |= bit;
  }
  return mask;
};

// Admin authority types (for admin panel access control)
export const AdminAuthority = {
  SYSADMIN: 0,
  BBS_CREATE: 1,
  BBS_DELETE: 2,
  BBS_SETTING: 3,
  BBS_THREAD: 4,
  BBS_THREADEDIT: 5,
  BBS_DELETERES: 6,
  BBS_DELETEFILE: 7,
  BBS_EDITUSER: 8,
  BBS_EDITNGWORD: 9,
  BBS_EDITBGDSL: 10,
  BBS_EDITHEADER: 11,
  BBS_EDITFOOTER: 12,
  BBS_EDITSIDEBAR: 13,
  BBS_LOGS: 14,
  SYS_SETTING: 15,
  SYS_USER: 16,
  BGDSL_EDIT: 17,
} as const;

export type AdminAuthorityValue = typeof AdminAuthority[keyof typeof AdminAuthority];

export const hasAuthority = (userAuthorities: number, requiredAuthority: AdminAuthorityValue): boolean => {
  if (userAuthorities & (1 << AdminAuthority.SYSADMIN)) return true;
  return (userAuthorities & (1 << requiredAuthority)) !== 0;
};

// Legacy string-based permission check (for backward compatibility)
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: Permission
): boolean => {
  if (userPermissions.includes("super")) return true;
  return userPermissions.includes(requiredPermission);
};
