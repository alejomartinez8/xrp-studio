import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config = {
    theme: {
        fontFamily: {},
        extend: {
            typography: {
                DEFAULT: {
                    css: {
                        color: '#313133',
                        maxWidth: 'none',
                        a: {
                            color: '#0c8ee3',
                            textDecoration: 'none',
                            fontWeight: '500',
                            '&:hover': {
                                color: '#0070c1',
                                textDecoration: 'underline',
                            },
                        },
                        h1: {
                            color: '#0c8ee3',
                            fontWeight: '700',
                            fontSize: '2.25rem',
                            marginTop: '0',
                            marginBottom: '1rem',
                        },
                        h2: {
                            color: '#0070c1',
                            fontWeight: '600',
                            fontSize: '1.875rem',
                            marginTop: '2rem',
                            marginBottom: '1rem',
                        },
                        h3: {
                            color: '#005a9e',
                            fontWeight: '600',
                            fontSize: '1.5rem',
                            marginTop: '1.5rem',
                            marginBottom: '0.75rem',
                        },
                        h4: {
                            color: '#004c83',
                            fontWeight: '600',
                            fontSize: '1.25rem',
                            marginTop: '1.25rem',
                            marginBottom: '0.5rem',
                        },
                        p: {
                            color: '#313133',
                            lineHeight: '1.75',
                            marginTop: '1rem',
                            marginBottom: '1rem',
                        },
                        code: {
                            backgroundColor: '#f0f7ff',
                            color: '#0070c1',
                            borderRadius: '0.375rem',
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.875em',
                            fontWeight: '600',
                            border: '1px solid #bae0fd',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        },
                        'code::before': {
                            content: '""',
                        },
                        'code::after': {
                            content: '""',
                        },
                        pre: {
                            backgroundColor: '#f6f6f7',
                            color: '#313133',
                            borderRadius: '0.75rem',
                            padding: '1.25rem',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem',
                            border: '1px solid #c6c6ca',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                            overflow: 'auto',
                        },
                        'pre code': {
                            backgroundColor: 'transparent',
                            color: '#313133',
                            padding: '0',
                            border: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '400',
                            lineHeight: '1.5',
                        },
                        'pre code .comment': {
                            color: '#7e7e86',
                            fontStyle: 'italic',
                        },
                        'pre code .keyword': {
                            color: '#0070c1',
                            fontWeight: '600',
                        },
                        'pre code .string': {
                            color: '#00416d',
                        },
                        'pre code .function': {
                            color: '#005a9e',
                        },
                        blockquote: {
                            borderLeftColor: '#bae0fd',
                            borderLeftWidth: '4px',
                            backgroundColor: '#f0f7ff',
                            padding: '1rem 1.5rem',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem',
                            borderRadius: '0.5rem',
                            fontStyle: 'italic',
                            color: '#004c83',
                        },
                        'blockquote p:first-of-type::before': {
                            content: '""',
                        },
                        'blockquote p:last-of-type::after': {
                            content: '""',
                        },
                        table: {
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem',
                            borderRadius: '0.5rem',
                            overflow: 'hidden',
                            border: '1px solid #c6c6ca',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        },
                        th: {
                            backgroundColor: '#e0effe',
                            color: '#0070c1',
                            fontWeight: '600',
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid #bae0fd',
                        },
                        td: {
                            backgroundColor: '#ffffff',
                            color: '#313133',
                            padding: '0.75rem',
                            borderBottom: '1px solid #c6c6ca',
                        },
                        'tbody tr:hover td': {
                            backgroundColor: '#f0f7ff',
                        },
                        ul: {
                            listStyleType: 'none',
                            paddingLeft: '1.5rem',
                        },
                        'ul > li': {
                            position: 'relative',
                            paddingLeft: '0.5rem',
                        },
                        'ul > li::before': {
                            content: '"•"',
                            color: '#0c8ee3',
                            fontWeight: 'bold',
                            position: 'absolute',
                            left: '-1rem',
                        },
                        ol: {
                            paddingLeft: '1.5rem',
                        },
                        'ol > li': {
                            paddingLeft: '0.5rem',
                        },
                        'ol > li::marker': {
                            color: '#0c8ee3',
                            fontWeight: '600',
                        },
                        hr: {
                            borderColor: '#c6c6ca',
                            marginTop: '2rem',
                            marginBottom: '2rem',
                        },
                        strong: {
                            color: '#004c83',
                            fontWeight: '600',
                        },
                        em: {
                            color: '#005a9e',
                            fontStyle: 'italic',
                        },
                    },
                },
                invert: {
                    css: {
                        color: '#e3e3e5',
                        a: {
                            color: '#36aaf5',
                            '&:hover': {
                                color: '#7cc8fb',
                            },
                        },
                        h1: { color: '#36aaf5' },
                        h2: { color: '#7cc8fb' },
                        h3: { color: '#bae0fd' },
                        h4: { color: '#e0effe' },
                        p: { color: '#e3e3e5' },
                        code: {
                            backgroundColor: '#313133',
                            color: '#7cc8fb',
                            border: '1px solid #4f4f55',
                        },
                        pre: {
                            backgroundColor: '#1a1a1b',
                            color: '#e3e3e5',
                            border: '1px solid #4f4f55',
                        },
                        'pre code': {
                            color: '#e3e3e5',
                        },
                        'pre code .comment': {
                            color: '#a2a2a8',
                        },
                        'pre code .keyword': {
                            color: '#36aaf5',
                        },
                        'pre code .string': {
                            color: '#7cc8fb',
                        },
                        'pre code .function': {
                            color: '#bae0fd',
                        },
                        blockquote: {
                            borderLeftColor: '#36aaf5',
                            backgroundColor: '#1a1a1b',
                            color: '#bae0fd',
                        },
                        th: {
                            backgroundColor: '#313133',
                            color: '#36aaf5',
                            borderBottom: '2px solid #4f4f55',
                        },
                        td: {
                            backgroundColor: '#1a1a1b',
                            color: '#e3e3e5',
                            borderBottom: '1px solid #4f4f55',
                        },
                        'tbody tr:hover td': {
                            backgroundColor: '#313133',
                        },
                        'ul > li::before': {
                            color: '#36aaf5',
                        },
                        'ol > li::marker': {
                            color: '#36aaf5',
                        },
                        hr: {
                            borderColor: '#4f4f55',
                        },
                        strong: {
                            color: '#bae0fd',
                        },
                        em: {
                            color: '#7cc8fb',
                        },
                    },
                },
            },
        },
    },
    plugins: [
        typography,
    ],
} satisfies Config;

export default config;
