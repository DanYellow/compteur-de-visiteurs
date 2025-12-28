export default {
    content: ['./src/emails/**/*.njk'],
    theme: {
        spacing: {
            0: '0',
            1: '4px',
            2: '8px',
            3: '12px',
            4: '16px',
            6: '24px',
        },
        colors: {
            'dark-green-numixs': '#acb115',
            'green-numixs': '#d5d916',
            'white-numixs': '#f5f5f5',
            'gray-numixs': '#312f2f',
            gray: {
                100: '#fff001',
                300: '#d1d5db',
                600: '#4b5563',
            },
            amber: {
                50: '#fffbeb',
                800: '#973c00',
            },
            primary: '#2563eb',
            danger: '#dc2626',
        },
        fontFamily: {
            sans: ['Calibri', 'sans-serif'],
            'title-font': ['Agency FB', 'sans-serif'],
        },
        borderWidth: {
            DEFAULT: '1px', // default for 'border'
            0: '0px',
            1: '1px',
            2: '2px',
            3: '3px',
            4: '4px',
            6: '6px',
            8: '8px',
        },
        borderStyle: {
            solid: 'solid',
            none: 'none',
        },
        fontSize: {
            base: "18px",
        },

        extend: {
            // colors: {
            //     'gray-numixs': 'red',
            // },
        },
    },
    corePlugins: {
        preflight: false,
        ringWidth: false,
        ringColor: false,
        ringOpacity: false,
        ringOffsetWidth: false,
        ringOffsetColor: false,
        ringOffsetOpacity: false,
        outline: false,
    },
    variants: {
        ringWidth: [],
        ringColor: [],
        ringOpacity: [],
        ringOffsetWidth: [],
        ringOffsetColor: [],
        ringOffsetOpacity: [],
        outline: [],
    }
};
// https://tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file
