import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/router';

import StatusMessage from '@/components/new-safe/create/steps/StatusStep/StatusMessage';
import useIsWrongChain from '@/hooks/useIsWrongChain';
import type { NewSafeFormData } from '@/components/new-safe/create';
import type { StepRenderProps } from '@/components/new-safe/CardStepper/useCardStepper';
import useSafeCreationEffects from '@/components/new-safe/create/steps/StatusStep/useSafeCreationEffects';
import {
  SafeCreationStatus,
  useSafeCreation,
} from '@/components/new-safe/create/steps/StatusStep/useSafeCreation';
import StatusStepper from '@/components/new-safe/create/steps/StatusStep/StatusStepper';
import { getRedirect } from '@/components/new-safe/create/logic';
import layoutCss from '@/components/new-safe/create/styles.module.css';
import { AppRoutes } from '@/config/routes';
import lightPalette from '@/components/theme/lightPalette';
import { useCurrentChain } from '@/hooks/useChains';
import { usePendingSafe } from './usePendingSafe';
import useSyncSafeCreationStep from '../../useSyncSafeCreationStep';
import { useWallet } from '@/hooks/useWallet';

export const getInitialCreationStatus = (
  willRelay: boolean
): SafeCreationStatus =>
  willRelay ? SafeCreationStatus.PROCESSING : SafeCreationStatus.AWAITING;

export const CreateSafeStatus = ({
  data,
  setProgressColor,
  setStep,
}: StepRenderProps<NewSafeFormData>) => {
  const router = useRouter();
  const chainInfo = useCurrentChain();
  const chainPrefix = chainInfo?.shortName || '';
  const { wallet } = useWallet();
  const isWrongChain = useIsWrongChain();
  const isConnected = wallet && !isWrongChain;
  const [pendingSafe, setPendingSafe] = usePendingSafe();
  useSyncSafeCreationStep(setStep);

  // The willRelay flag can come from the previous step or from local storage
  const willRelay = true;
  const initialStatus = getInitialCreationStatus(willRelay);
  const [status, setStatus] = useState<SafeCreationStatus>(initialStatus);

  const { handleCreateSafe } = useSafeCreation(status, setStatus, willRelay);

  useSafeCreationEffects({
    status,
    setStatus,
  });

  const onClose = useCallback(() => {
    setPendingSafe(undefined);

    router.push(AppRoutes.welcome.index);
  }, [router, setPendingSafe]);

  const handleRetry = useCallback(() => {
    setStatus(initialStatus);
    void handleCreateSafe();
  }, [handleCreateSafe, initialStatus]);

  const onFinish = useCallback(() => {

    const { safeAddress } = pendingSafe || {};

    if (safeAddress) {
      setPendingSafe(undefined);
      router.push(
        getRedirect(chainPrefix, safeAddress, router.query?.safeViewRedirectURL)
      );
    }
  }, [chainPrefix, pendingSafe, router, setPendingSafe]);

  const displaySafeLink = status >= SafeCreationStatus.INDEXED;
  const isError =
    status >= SafeCreationStatus.WALLET_REJECTED &&
    status <= SafeCreationStatus.TIMEOUT;

  useEffect(() => {
    if (!setProgressColor) return;

    if (isError) {
      setProgressColor(lightPalette.error.main);
    } else {
      setProgressColor(lightPalette.secondary.main);
    }
  }, [isError, setProgressColor]);

  return (
    <Paper
      sx={{
        textAlign: 'center',
      }}
    >
      <Box className={layoutCss.row}>
        <StatusMessage status={status} isError={isError} />
      </Box>

      {!isError && pendingSafe && (
        <>
          <Divider />
          <Box className={layoutCss.row}>
            <StatusStepper status={status} />
          </Box>
        </>
      )}

      {displaySafeLink && (
        <>
          <Divider />
          <Box className={layoutCss.row}>
            <Button
              data-testid='start-using-safe-btn'
              variant='contained'
              onClick={onFinish}
            >
              Start using {'Safe{Wallet}'}
            </Button>
          </Box>
        </>
      )}

      {isError && (
        <>
          <Divider />
          <Box className={layoutCss.row}>
            <Box
              display='flex'
              flexDirection='row'
              justifyContent='space-between'
              gap={3}
            >
              <Button onClick={onClose} variant='outlined'>
                Cancel
              </Button>
              <Tooltip
                title={
                  !isConnected
                    ? 'Please make sure your wallet is connected on the correct network.'
                    : ''
                }
              >
                <Typography display='flex' height={1}>
                  <Button
                    onClick={handleRetry}
                    variant='contained'
                    disabled={!isConnected}
                  >
                    Retry
                  </Button>
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};
