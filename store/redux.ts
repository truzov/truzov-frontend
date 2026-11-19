import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { guestCartReducer, isGuestCartMutation, saveGuestCart } from '@/lib/cart/guest-cart.store';
import { authModalReducer } from './auth-modal.store';
import { authReducer, type AuthRuntime } from './auth.store';
import { checkoutReducer, isCheckoutMutation, saveCheckout } from './checkout.store';
import { otpModalReducer } from './otp-modal.store';
import { uiReducer } from './ui.store';

const reducer = combineReducers({
  auth: authReducer,
  authModal: authModalReducer,
  checkout: checkoutReducer,
  guestCart: guestCartReducer,
  otpModal: otpModalReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof reducer>;

export function makeStore() {
  const authRuntime: AuthRuntime = { otpSessionId: null };
  // ponytail: write only on mutations so loading or tab sync never echoes a storage event.
  const storage = createListenerMiddleware<RootState>();
  storage.startListening({
    matcher: isGuestCartMutation,
    effect: (_, api) => { saveGuestCart(api.getState().guestCart.items); },
  });
  storage.startListening({
    matcher: isCheckoutMutation,
    effect: (_, api) => { saveCheckout(api.getState().checkout); },
  });

  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      thunk: { extraArgument: authRuntime },
    }).prepend(storage.middleware),
    devTools: false,
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export const useAppDispatch = useDispatch.withTypes<AppStore['dispatch']>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
