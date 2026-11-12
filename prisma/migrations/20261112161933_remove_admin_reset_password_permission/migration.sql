-- ลบสิทธิ์ admins:reset_password ที่เลิกใช้แล้ว (admin ลืมรหัสให้ใช้ลืมรหัสผ่านทาง email แทน)
DELETE FROM "account_permissions" WHERE "permission" = 'admins:reset_password';
