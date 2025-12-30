import postcssLogical from 'postcss-logical';
import autoprefixer from 'autoprefixer';

export default {
    plugins: [
        postcssLogical({
            preserve: false,
        }),
        autoprefixer({
            overrideBrowserslist: ['ie 11'],
        }),
    ],
};
