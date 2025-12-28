const fs = require('fs');
const path = require('path');

// Font size mappings - all to 14pt
const fontSizeReplacements = [
    { from: /text-\[10pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[11pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[12pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[13pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[15pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[16pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[18pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[20pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[24pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[32pt\]/g, to: 'text-[14pt]' },
    { from: /text-\[50pt\]/g, to: 'text-[14pt]' },
];

// Remove responsive font sizes (sm:text-*)
const responsiveFontRemoval = [
    { from: /\s+sm:text-\[10pt\]/g, to: '' },
    { from: /\s+sm:text-\[11pt\]/g, to: '' },
    { from: /\s+sm:text-\[12pt\]/g, to: '' },
    { from: /\s+sm:text-\[13pt\]/g, to: '' },
    { from: /\s+sm:text-\[14pt\]/g, to: '' },
    { from: /\s+sm:text-\[15pt\]/g, to: '' },
    { from: /\s+sm:text-\[16pt\]/g, to: '' },
    { from: /\s+sm:text-\[18pt\]/g, to: '' },
    { from: /\s+sm:text-\[20pt\]/g, to: '' },
    { from: /\s+sm:text-\[24pt\]/g, to: '' },
    { from: /\s+sm:text-\[32pt\]/g, to: '' },
    { from: /\s+sm:text-\[50pt\]/g, to: '' },
];

// Horizontal padding replacements - all to 1
const paddingReplacements = [
    { from: /\bpx-2\b/g, to: 'px-1' },
    { from: /\bpx-3\b/g, to: 'px-1' },
    { from: /\bpx-4\b/g, to: 'px-1' },
    { from: /\bpx-5\b/g, to: 'px-1' },
    { from: /\bpx-6\b/g, to: 'px-1' },
    { from: /\bpx-8\b/g, to: 'px-1' },
    { from: /\bpl-2\b/g, to: 'pl-1' },
    { from: /\bpl-3\b/g, to: 'pl-1' },
    { from: /\bpl-4\b/g, to: 'pl-1' },
    { from: /\bpl-5\b/g, to: 'pl-1' },
    { from: /\bpl-6\b/g, to: 'pl-1' },
    { from: /\bpr-2\b/g, to: 'pr-1' },
    { from: /\bpr-3\b/g, to: 'pr-1' },
    { from: /\bpr-4\b/g, to: 'pr-1' },
    { from: /\bpr-5\b/g, to: 'pr-1' },
    { from: /\bpr-6\b/g, to: 'pr-1' },
    { from: /\bpr-7\b/g, to: 'pr-1' },
];

// Remove responsive padding
const responsivePaddingRemoval = [
    { from: /\s+sm:px-2\b/g, to: '' },
    { from: /\s+sm:px-3\b/g, to: '' },
    { from: /\s+sm:px-4\b/g, to: '' },
    { from: /\s+sm:px-5\b/g, to: '' },
    { from: /\s+sm:px-6\b/g, to: '' },
];

// Horizontal margin replacements - all to 1
const marginReplacements = [
    { from: /\bmx-2\b/g, to: 'mx-1' },
    { from: /\bmx-3\b/g, to: 'mx-1' },
    { from: /\bmx-4\b/g, to: 'mx-1' },
    { from: /\bmx-6\b/g, to: 'mx-1' },
];

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Apply font size replacements
        fontSizeReplacements.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                modified = true;
            }
        });

        // Remove responsive font sizes
        responsiveFontRemoval.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                modified = true;
            }
        });

        // Apply padding replacements
        paddingReplacements.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                modified = true;
            }
        });

        // Remove responsive padding
        responsivePaddingRemoval.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                modified = true;
            }
        });

        // Apply margin replacements
        marginReplacements.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function findTsxFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and .next directories
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                findTsxFiles(filePath, fileList);
            }
        } else if (file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Main execution
console.log('🎨 Starting style standardization...\n');

const appDir = path.join(__dirname, 'app');
const componentsDir = path.join(__dirname, 'components');

let totalFiles = 0;
let modifiedFiles = 0;

// Process app directory
console.log('📁 Processing app directory...');
const appFiles = findTsxFiles(appDir);
appFiles.forEach(file => {
    totalFiles++;
    if (processFile(file)) {
        modifiedFiles++;
    }
});

// Process components directory
console.log('\n📁 Processing components directory...');
const componentFiles = findTsxFiles(componentsDir);
componentFiles.forEach(file => {
    totalFiles++;
    if (processFile(file)) {
        modifiedFiles++;
    }
});

console.log(`\n✅ Complete! Modified ${modifiedFiles} out of ${totalFiles} files.`);
console.log('\n📝 Changes applied:');
console.log('   • All font sizes standardized to 14pt');
console.log('   • All horizontal padding (px-, pl-, pr-) set to 1');
console.log('   • All horizontal margins (mx-) set to 1');
console.log('   • Removed responsive font size variants (sm:text-*)');
console.log('   • Removed responsive padding variants (sm:px-*)');
