/**
 * Barrel import: registers every cl-* component as a side effect.
 *
 * Used by the sandboxed code runner (playground, editable showcase, tutorial)
 * so that any component a snippet references is already defined. Importing this
 * once pulls in the whole library.
 */
import './form/code-editor.js';
import './misc/code-block.js';
import './form/input-text.js';
import './form/input-number.js';
import './form/textarea.js';
import './form/checkbox.js';
import './form/radio-button.js';
import './form/slider.js';
import './form/calendar.js';
import './form/input-mask.js';
import './form/input-password.js';
import './form/toggle.js';
import './form/input-search.js';
import './form/inplace.js';
import './form/rating.js';
import './form/otp.js';
import './selection/dropdown.js';
import './selection/multiselect.js';
import './selection/autocomplete.js';
import './selection/chips.js';
import './selection/segmented.js';
import './data/datatable.js';
import './data/paginator.js';
import './data/tree.js';
import './data/orderable-list.js';
import './data/virtual-list.js';
import './data/timeline.js';
import './data/meter.js';
import './panel/accordion.js';
import './panel/tabview.js';
import './panel/card.js';
import './panel/fieldset.js';
import './panel/splitter.js';
import './panel/stepper.js';
import './overlay/dialog.js';
import './overlay/sidebar.js';
import './overlay/toast.js';
import './overlay/tooltip.js';
import './overlay/action-menu.js';
import './overlay/context-menu.js';
import './overlay/popover.js';
import './button/button.js';
import './button/split-button.js';
import './button/menu.js';
import './button/breadcrumb.js';
import './misc/progressbar.js';
import './misc/fileupload.js';
import './misc/dropzone.js';
import './misc/divider.js';
import './misc/avatar.js';
import './misc/skeleton.js';
import './misc/empty.js';
import './misc/copy.js';
import './misc/colorpicker.js';
import './misc/spinner.js';
import './misc/badge.js';
import './misc/alert.js';
import './misc/error-boundary.js';
import './layout/shell.js';
