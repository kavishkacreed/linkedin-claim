require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');

// Verify credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error(`
Error: Missing Supabase environment variables.
Please create a '.env' file in this directory with the following variables:
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-service-role-key
  TARGET_URL=your-linkedin-premium-coupon-url
`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded 0, 1, I, O, L
  let result = 'LNKD-';
  
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help') {
  console.log(`
LinkedIn Claim Dashboard Code Manager CLI (Supabase Edition)
===========================================================
Usage:
  node manage-codes.js set-target <url>     Set/update the target URL in your local .env file
  node manage-codes.js generate <count>     Generate and upload new claim codes to Supabase
  node manage-codes.js list                 List all claim codes from Supabase
  node manage-codes.js reset <code>         Reset a code to unused in Supabase
  node manage-codes.js delete <code>        Delete a code from Supabase
  node manage-codes.js clear                Delete ALL claim codes from Supabase
  `);
  process.exit(0);
}

async function run() {
  switch (command) {
    case 'set-target': {
      const url = args[1];
      if (!url) {
        console.error('Error: Please provide a target URL.');
        process.exit(1);
      }

      let envContent = '';
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
      }

      const envRegex = /^TARGET_URL=.*$/m;
      if (envRegex.test(envContent)) {
        envContent = envContent.replace(envRegex, `TARGET_URL=${url}`);
      } else {
        envContent += `\nTARGET_URL=${url}\n`;
      }

      fs.writeFileSync(ENV_FILE, envContent.trim() + '\n', 'utf8');
      console.log(`Successfully updated TARGET_URL in .env file to:\n${url}`);
      console.log('NOTE: When hosting in production (e.g. Render/Vercel), update the TARGET_URL environment variable in their dashboard.');
      break;
    }

    case 'generate': {
      const count = parseInt(args[1], 10) || 1;
      console.log(`Generating ${count} new claim code(s) and uploading to Supabase...`);
      
      const newCodes = [];
      const insertRows = [];
      
      for (let i = 0; i < count; i++) {
        const code = generateRandomCode();
        newCodes.push(code);
        insertRows.push({
          code: code,
          used: false,
          redeemed_at: null,
          ip: null
        });
      }

      // Insert into Supabase
      const { data, error } = await supabase
        .from('claim_codes')
        .insert(insertRows);

      if (error) {
        console.error('Error uploading codes to Supabase:', error.message);
        process.exit(1);
      }

      console.log('\nGenerated & Uploaded Codes:');
      newCodes.forEach(code => console.log(`  - ${code}`));
      console.log('\nCodes successfully saved to Supabase!');
      break;
    }

    case 'list': {
      console.log('Fetching codes from Supabase...');
      const { data: codes, error } = await supabase
        .from('claim_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching codes:', error.message);
        process.exit(1);
      }

      if (codes.length === 0) {
        console.log('No claim codes found in Supabase database. Use "generate" to add some.');
        break;
      }

      console.log('\nClaim Codes List (Supabase):');
      console.log('------------------------------------------------------------');
      console.log(`${'Code'.padEnd(16)} | ${'Status'.padEnd(8)} | ${'Redeemed At'.padEnd(25)}`);
      console.log('------------------------------------------------------------');
      
      codes.forEach(info => {
        const status = info.used ? 'USED' : 'ACTIVE';
        const redeemed = info.redeemed_at ? info.redeemed_at : 'N/A';
        console.log(`${info.code.padEnd(16)} | ${status.padEnd(8)} | ${redeemed.padEnd(25)}`);
      });
      
      console.log('------------------------------------------------------------');
      console.log(`Total Codes: ${codes.length}`);
      break;
    }

    case 'reset': {
      const code = (args[1] || '').trim().toUpperCase();
      if (!code) {
        console.error('Error: Please provide a claim code to reset.');
        process.exit(1);
      }

      console.log(`Resetting code ${code} in Supabase...`);
      const { data, error } = await supabase
        .from('claim_codes')
        .update({
          used: false,
          redeemed_at: null,
          ip: null
        })
        .eq('code', code)
        .select();

      if (error) {
        console.error('Error resetting code:', error.message);
        process.exit(1);
      }

      if (data.length === 0) {
        console.log(`Code "${code}" was not found in Supabase.`);
      } else {
        console.log(`Successfully reset code: ${code}`);
      }
      break;
    }

    case 'delete': {
      const code = (args[1] || '').trim().toUpperCase();
      if (!code) {
        console.error('Error: Please provide a claim code to delete.');
        process.exit(1);
      }

      console.log(`Deleting code ${code} from Supabase...`);
      const { data, error } = await supabase
        .from('claim_codes')
        .delete()
        .eq('code', code)
        .select();

      if (error) {
        console.error('Error deleting code:', error.message);
        process.exit(1);
      }

      if (data.length === 0) {
        console.log(`Code "${code}" was not found in Supabase.`);
      } else {
        console.log(`Successfully deleted code: ${code}`);
      }
      break;
    }

    case 'clear': {
      console.log('WARNING: This will delete ALL claim codes in your database.');
      console.log('Deleting all codes...');
      
      // Select all and delete (Supabase requires filter for delete unless specifically configured, using filter for all)
      const { error } = await supabase
        .from('claim_codes')
        .delete()
        .neq('code', ''); // Deletes all rows where code is not empty

      if (error) {
        console.error('Error clearing codes:', error.message);
        process.exit(1);
      }

      console.log('All claim codes have been deleted from Supabase.');
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Type "node manage-codes.js help" for info.`);
      break;
  }
}

run();
