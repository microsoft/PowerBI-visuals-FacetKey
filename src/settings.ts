/**
 * Copyright (c) 2016 Uncharted Software Inc.
 * http://www.uncharted.software/
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

/**
 * "Facet Count" card - how many facet instances are shown initially / per "More" click.
 * Mirrors the `facetCount` object declared in capabilities.json.
 */
class FacetCountCard extends formattingSettings.SimpleCard {
    name = 'facetCount';
    displayName = 'Facet Count';
    description = 'Configure how many facets are loaded';

    initial = new formattingSettings.NumUpDown({
        name: 'initial',
        displayName: 'Initial',
        value: 4,
    });
    increment = new formattingSettings.NumUpDown({
        name: 'increment',
        displayName: 'Increment',
        value: 50,
    });

    slices = [this.initial, this.increment];
}

/**
 * "Display" card - toggles the "selected / total" count label.
 * Mirrors the `display` object declared in capabilities.json.
 */
class DisplayCard extends formattingSettings.SimpleCard {
    name = 'display';
    displayName = 'Display';
    description = 'Facet display option';

    selectionCount = new formattingSettings.ToggleSwitch({
        name: 'selectionCount',
        displayName: 'Selection Count',
        value: false,
    });

    slices = [this.selectionCount];
}

/**
 * Root formatting settings model surfaced in the PowerBI formatting pane via getFormattingModel().
 * Note: `facetState` (facet order/collapse/range persistence) is intentionally NOT represented
 * here - it is persisted directly via host.persistProperties and must stay hidden from the pane.
 */
export class VisualFormattingSettings extends formattingSettings.Model {
    facetCount = new FacetCountCard();
    display = new DisplayCard();

    cards = [this.facetCount, this.display];
}
