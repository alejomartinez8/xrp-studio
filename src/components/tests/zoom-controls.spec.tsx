import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import ZoomControls from '@components/python/zoom-controls';
import AppMgr, { EventType } from '@/managers/appmgr';
import { FontSize } from '@/utils/types';

describe('ZoomControls', () => {
    afterEach(() => vi.restoreAllMocks());

    it('asks the Python editor for a bigger or smaller font', () => {
        const emit = vi.spyOn(AppMgr.getInstance(), 'emit');
        render(<ZoomControls />);
        fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
        expect(emit).toHaveBeenLastCalledWith(EventType.EVENT_FONTCHANGE, FontSize.INCREASE);
        fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
        expect(emit).toHaveBeenLastCalledWith(EventType.EVENT_FONTCHANGE, FontSize.DESCREASE);
    });
});
