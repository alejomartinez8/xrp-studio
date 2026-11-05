/**
 * GitHub-style (Primer) theme for Tailwind.
 *
 * The app's components use the named palettes below (curious-blue, matisse, shark, ...). Replacing
 * their values here restyles the whole app without touching components:
 * - shark, mountain-mist: Primer neutral grays (light canvas #f6f8fa to dark canvas #0d1117)
 * - curious-blue: Primer blue for links, selection and accents; shade 700 is the header colour
 *   (#24292f), because every header, menu and context menu uses bg-curious-blue-700
 * - matisse: grays used for menu hovers and buttons on the dark header
 * - chateau-green, cinnabar: Primer green (Run) and red (Stop)
 * Rounded corners follow GitHub's 6px radius; `rounded-full` stays round.
 */
const neutral = {
    50: '#f6f8fa',
    100: '#eaeef2',
    200: '#d0d7de',
    300: '#afb8c1',
    400: '#8c959f',
    500: '#6e7781',
    600: '#57606a',
    700: '#424a53',
    800: '#30363d',
    900: '#21262d',
    950: '#0d1117',
};

module.exports = {
    colors: {
        shark: neutral,
        'mountain-mist': neutral,
        'curious-blue': {
            50: '#f0f8ff',
            100: '#ddf4ff',
            200: '#b6e3ff',
            300: '#80ccff',
            400: '#54aeff',
            500: '#218bff',
            600: '#0969da',
            700: '#24292f',
            800: '#0550ae',
            900: '#033d8b',
            950: '#0a3069',
        },
        matisse: {
            50: '#f6f8fa',
            100: '#eaeef2',
            200: '#d0d7de',
            300: '#afb8c1',
            400: '#57606a',
            500: '#424a53',
            600: '#32383f',
            700: '#24292f',
            800: '#1c2128',
            900: '#1f2328',
            950: '#010409',
        },
        'chateau-green': {
            50: '#dafbe1',
            100: '#aceebb',
            200: '#6fdd8b',
            300: '#4ac26b',
            400: '#2da44e',
            500: '#1f883d',
            600: '#1a7f37',
            700: '#116329',
            800: '#044f1e',
            900: '#003d16',
            950: '#002d11',
        },
        cinnabar: {
            50: '#fff5f4',
            100: '#ffebe9',
            200: '#ffcecb',
            300: '#ffaba8',
            400: '#ff8182',
            500: '#fa4549',
            600: '#cf222e',
            700: '#a40e26',
            800: '#82071e',
            900: '#660018',
            950: '#4c0014',
        },
    },
    borderRadius: {
        md: '6px',
        lg: '6px',
        xl: '6px',
        '2xl': '6px',
        '3xl': '6px',
    },
};
