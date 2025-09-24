/**
 * ESLint configuration for Leasing Module
 * Enforces shadcn/ui component usage only
 */

module.exports = {
  extends: ['./.eslintrc.js'],
  overrides: [
    {
      files: ['components/modules/leasing/**/*.{ts,tsx}', 'components/leasing/**/*.{ts,tsx}'],
      rules: {
        // Restrict imports to only allowed UI components
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/components/ui/*'],
                message: 'Import UI components from @/components/leasing/shadcn-components instead'
              },
              {
                group: ['react-icons/*', '@heroicons/*', 'feather-icons/*'],
                message: 'Only lucide-react icons are allowed. Import from @/components/leasing/shadcn-components'
              },
              {
                group: ['@headlessui/*', '@radix-ui/*'],
                message: 'Use shadcn/ui components instead of direct headless/radix imports'
              },
              {
                group: ['antd', 'react-bootstrap', 'semantic-ui-react', '@mui/*', '@mantine/*'],
                message: 'Third-party UI libraries are not allowed. Use shadcn/ui components only'
              }
            ],
            paths: [
              {
                name: 'lucide-react',
                message: 'Import icons from @/components/leasing/shadcn-components instead'
              }
            ]
          }
        ],
        
        // Enforce consistent component naming
        'react/jsx-pascal-case': [
          'error',
          {
            allowAllCaps: false,
            ignore: []
          }
        ],
        
        // Ensure proper TypeScript usage
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        
        // Accessibility rules (shadcn/ui components are accessible by default)
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',
        'jsx-a11y/role-supports-aria-props': 'error'
      }
    }
  ]
};
