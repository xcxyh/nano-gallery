// 快速检查环境变量配置的脚本
// 运行: node check-env.js

require('dotenv').config({ path: '.env.local' });

const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'Supabase 项目 URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase 匿名密钥 (必需)',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase 服务角色密钥'
};

console.log('\n🔍 检查 Supabase 环境变量配置...\n');

let allConfigured = true;

for (const [key, description] of Object.entries(requiredVars)) {
  const value = process.env[key];
  if (value && value !== 'placeholder-key' && value !== 'https://placeholder.supabase.co') {
    // 只显示前 20 个字符，隐藏完整密钥
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`✅ ${key}`);
    console.log(`   描述: ${description}`);
    console.log(`   值: ${displayValue}\n`);
  } else {
    console.log(`❌ ${key} - 未配置或使用占位符`);
    console.log(`   描述: ${description}\n`);
    allConfigured = false;
  }
}

if (allConfigured) {
  console.log('✅ 所有必需的环境变量都已配置！\n');
} else {
  console.log('❌ 请检查 .env.local 文件并配置缺失的环境变量。\n');
  console.log('📖 参考 SUPABASE_SETUP.md 获取配置说明\n');
}

