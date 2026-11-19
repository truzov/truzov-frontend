import { render, type RenderOptions } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '@/store/redux';

export function reduxWrapper(store: AppStore, Wrapper?: RenderOptions['wrapper']) {
  return function ReduxWrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{Wrapper ? <Wrapper>{children}</Wrapper> : children}</Provider>;
  };
}

export function renderWithRedux(
  ui: ReactElement,
  { store = makeStore(), wrapper, ...options }: RenderOptions & { store?: AppStore } = {},
) {
  return render(ui, { ...options, wrapper: reduxWrapper(store, wrapper) });
}
