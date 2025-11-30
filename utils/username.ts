/**
 * 邮箱验证工具
 */

// 邮箱格式正则表达式
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 验证结果和错误信息
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || email.trim().length === 0) {
        return { valid: false, error: '邮箱地址不能为空' };
    }

    const trimmed = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmed)) {
        return { valid: false, error: '请输入有效的邮箱地址' };
    }

    // 检查邮箱长度
    if (trimmed.length > 254) {
        return { valid: false, error: '邮箱地址过长' };
    }

    // 检查 @ 符号前后的部分
    const [localPart, domain] = trimmed.split('@');

    if (!localPart || localPart.length === 0) {
        return { valid: false, error: '邮箱地址格式不正确' };
    }

    if (localPart.length > 64) {
        return { valid: false, error: '邮箱用户名部分过长' };
    }

    if (!domain || domain.length === 0) {
        return { valid: false, error: '邮箱地址格式不正确' };
    }

    return { valid: true };
}

/**
 * 规范化邮箱（转换为小写，去除空格）
 * @param email 原始邮箱
 * @returns 规范化后的邮箱
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * 从邮箱中提取用户名（@ 之前的部分）
 * @param email 邮箱地址
 * @returns 用户名部分
 */
export function extractUsernameFromEmail(email: string): string {
    const normalized = normalizeEmail(email);
    return normalized.split('@')[0];
}

