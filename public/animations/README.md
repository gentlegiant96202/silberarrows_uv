# Lottie Animations Folder

This folder contains Lottie JSON animation files used throughout the application.

## How to Add Your Lottie Animation

1. **Export your Lottie animation as JSON** (not the `.lottie` format, but the `.json` format)
   
2. **Name it `loader.json`** and place it in this folder (`/public/animations/loader.json`)

3. The animation will automatically be picked up by the `PulsatingLogo` component used in:
   - Marketing module loading screen
   - All other module loading screens that use `PulsatingLogo`

## File Location

```
/public/animations/loader.json  <-- Place your Lottie JSON file here
```

## Animation Requirements

- **Format**: JSON (Lottie JSON format)
- **Recommended size**: Keep animations under 100KB for optimal performance
- **Loop**: The animation will automatically loop
- **Autoplay**: The animation will start playing immediately

## Fallback Behavior

If `loader.json` is not found, the component will automatically fall back to displaying the static logo image (`/MAIN LOGO.png`) with a pulsing animation.

## Testing

After placing your `loader.json` file:
1. Navigate to the marketing module
2. Refresh the page
3. You should see your Lottie animation during the loading state

## Optional: Multiple Animations

You can also pass a custom animation directly to the `PulsatingLogo` component:

```tsx
import animationData from './path/to/animation.json';

<PulsatingLogo 
  lottieData={animationData}
  size={64}
  text="Loading..."
/>
```

## Disabling Lottie

To disable Lottie and use the static image instead:

```tsx
<PulsatingLogo 
  useLottie={false}
  size={64}
  text="Loading..."
/>
```

