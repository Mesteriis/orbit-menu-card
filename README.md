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
| `animation.duration` | 260 | 0–1000 ms |
| `animation.stagger` | 24 | 0–120 ms |
| `show_labels` | true | boolean |
| `selected` | unset | initial local selection value |

Provide 1–12 items with unique `id` values (derived from `value` or position if omitted). Select values must be unique. If forced layouts cannot fit, an explicit error is displayed. Auto layout is recommended near screen edges.

Actions: `navigate`, `url` (HTTP/HTTPS), `more-info`, `toggle`, `perform-action`, legacy `call-service`, `fire-dom-event`, and `none`. `confirmation` is supported via a browser confirmation dialog. Local navigation requires an absolute dashboard path beginning with `/`. Service failures are surfaced without changing a bound selector optimistically. No entities, credentials, or backend integrations are created.

## Development

Dependency-free ES module. Run `npm run check` with Node.js 20+. Tests cover anchored edge/corner placement, collision boundaries, three modes, service forwarding, unsafe links and configuration bounds. Browser validation is also required for animation, focus and backdrop behavior.

MIT license. Uses Home Assistant's native `ha-icon` component. Orbit raster artwork is embedded in the module, so installation requires a single resource.
