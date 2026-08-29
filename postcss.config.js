import postcssLogical from 'postcss-logical';
import autoprefixer from 'autoprefixer';

const removehover = (opts = {}) => {
    return {
        postcssPlugin: 'postcss-removehover',
        AtRule: {
            media: (atRule) => {
                if (atRule.params.includes('hover:hover')) {
                    atRule.remove();
                }
            },
        },
    };
};

export default {
    plugins: [
        postcssLogical({
            preserve: false,
        }),
        autoprefixer({
            overrideBrowserslist: ['ie 11'],
        }),
        removehover(),
    ],
};
