# Orbit Menu Card

An anchored radial control for Home Assistant dashboards. Satellites fly out of the original button and return to it. A full-screen dimmed, blurred backdrop leaves the dashboard layout untouched.

Three behaviors, one component:

- `select`: choose a value, close the menu, and show the chosen icon/name on the trigger. Bind an existing `input_select` or `select` entity for persistence, or omit `entity` for a local choice lasting until the card is recreated.
- `menu`: execute a dashboard action and close.
- `menu-open`: execute an action and remain open. Navigation can naturally destroy the card when leaving the page.

`auto` chooses a circle, inward fan, or narrower corner arc without moving the trigger. Escape, the trigger, or the backdrop closes the menu. Keyboard arrows, Home and End navigate options; reduced motion is respected. Designed and tested for desktop.

## Install with HACS

Add `Mesteriis/orbit-menu-card` as a custom repository, category **Dashboard**, and download. If HACS does not register the resource automatically, add `/hacsfiles/orbit-menu-card/orbit-menu-card.js` as a JavaScript module under Dashboard Resources. Reload the browser.

## Configuration

```yaml
type: custom:orbit-menu-card
name: Navigation
icon: mdi:dots-grid
mode: menu
layout: auto
radius: 160
button_size: 72
item_size: 60
show_labels: true
backdrop:
  opacity: 0.45
  blur: 8
animation:
  open: clockwise
  close: reverse
  duration: 260
  stagger: 24
items:
  - name: Rooms
    icon: mdi:sofa-outline
    tap_action:
      action: navigate
      navigation_path: /lovelace/rooms
  - name: Scenes
    icon: mdi:palette-outline
    entity: scene.relax
    tap_action:
      action: perform-action
      perform_action: scene.turn_on
      target:
        entity_id: scene.relax
```

For a selector:

```yaml
type: custom:orbit-menu-card
name: House mode
mode: select
entity: input_select.house_mode # optional; must already exist
items:
  - name: Home
    value: Home # exactly match entity options
    icon: mdi:home-outline
  - name: Away
    value: Away
    icon: mdi:home-export-outline
```

For repeated actions use `mode: menu-open` with the same `items` format. All three modes are available in the visual editor. Item/action details can be edited as JSON there or as dashboard YAML.

### Parameters

| Parameter | Default | Range / values |
|---|---|---|
| `mode` | `menu` | `select`, `menu`, `menu-open` |
| `layout` | `auto` | `auto`, `circle`, `fan`, `arc` |
| `radius` | 160 | 90–480 px preferred radius; auto may expand to prevent overlap |
| `button_size` | 72 | 40–120 px |
| `item_size` | 60 | 40–100 px |
| `backdrop.opacity` | 0.45 | 0–1 |
| `backdrop.blur` | 8 | 0–24 px |
| `animation.open` | `clockwise` | see presets below |
| `animation.close` | `reverse` | presets or `reverse` |
| `animation.duration` | 260 | 0–1000 ms |
| `animation.stagger` | 24 | 0–120 ms |
| `show_labels` | true | boolean |
| `selected` | unset | initial local selection value |

Provide 1–12 items with unique `id` values (derived from `value` or position if omitted). Select values must be unique. If forced layouts cannot fit, an explicit error is displayed. Auto layout is recommended near screen edges.

Actions: `navigate`, `url` (HTTP/HTTPS), `more-info`, `toggle`, `perform-action`, legacy `call-service`, `fire-dom-event`, and `none`. `confirmation` is supported via a browser confirmation dialog. Local navigation requires an absolute dashboard path beginning with `/`. Service failures are surfaced without changing a bound selector optimistically. No entities, credentials, or backend integrations are created.

### Flight animations

Choose `burst`, `clockwise`, `counterclockwise`, `spiral-clockwise` or `spiral-counterclockwise` independently for `animation.open` and `animation.close`. Closing also accepts `reverse`, which reverses the opening direction and order. `duration` sets travel time and `stagger` sets the interval between buttons. Spirals make a full turn for a circle; near edges their sweep stays within the available fan/arc sector. Escape can interrupt an opening animation and return buttons from their current positions. Reduced-motion disables flights.

## Development

Dependency-free ES module. Run `npm run check` with Node.js 20+. Tests cover anchored edge/corner placement, collision boundaries, three modes, service forwarding, unsafe links and configuration bounds. Browser validation is also required for animation, focus and backdrop behavior.

MIT license. Uses Home Assistant's native `ha-icon` component. Orbit lines, dots and connectors are drawn in JavaScript on a high-DPI canvas from the exact button coordinates. No decorative raster or external assets are used; installation requires a single resource.

## Menu position and alarm PIN (v0.1.5)

`menu_position.preset`: `trigger` (default), `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, or `custom`. Corner presets use 25/75 percent of the viewport. Custom `x`/`y` are percentages (0–100). The trigger keeps its layout position; satellites fly from it to the chosen orbit. Automatic circle/fan/arc fitting still applies. Forced positions that cannot fit report an explicit error.

```yaml
menu_position:
  preset: custom
  x: 60
  y: 45
```

Alarm keypad:
```yaml
type: custom:orbit-menu-card
name: Снять охрану
icon: mdi:shield-lock-outline
mode: pin
entity: alarm_control_panel.your_alarm
menu_position:
  preset: center
pin:
  length: 6
```

PIN mode provides digits 0–9, erase and submit; physical keyboard digits, Backspace and Enter also work. The center field displays stars and length must be an integer from 4 to 8. PIN mode defaults to a centered orbit; the close button is hidden. Click the backdrop or press Escape to close. PIN mode defaults to a larger 260px radius, configurable through `radius`. The card layout never moves.

The correct PIN is never configured in frontend YAML. Home Assistant's alarm integration must enforce the code server-side. The card sends it only as `code` to `alarm_control_panel.alarm_disarm` for the configured entity. It clears the transient input on submit/close and waits for a real `disarmed` state before successful closure; a ten-second timeout reports no confirmation. This is a numeric keypad, not a frontend authentication gate. Do not configure a code-less alarm if PIN protection is required. No PIN is logged, persisted or emitted as a DOM event.
