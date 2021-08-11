import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  Typography,
  FormControl,
  Box,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Button,
  Fade,
  Slide,
} from "@material-ui/core";
import { shorten, trim, secondsUntilBlock, prettifySeconds } from "../../helpers";
import { changeApproval, calcBondDetails, calculateUserBondDetails, bondAsset } from "../../actions/Bond.actions";
import { BONDS } from "../../constants";
import { useWeb3Context } from "src/hooks/web3Context";
import { useAppSelector } from "src/hooks";
import { isPendingTxn, txnButtonText } from "src/actions/PendingTxns.actions";

interface IBondPurchaseProps {
  readonly bond: string;
  readonly slippage: number;
}

function BondPurchase({ bond, slippage }: IBondPurchaseProps) {
  const dispatch = useDispatch();
  const { provider, address, chainID } = useWeb3Context();

  const [recipientAddress, setRecipientAddress] = useState(address);
  const [quantity, setQuantity] = useState(0);

  const currentBlock = useAppSelector(state => {
    return state.app.currentBlock || 0;
  });

  const vestingTerm = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && state.bonding[bond].vestingBlock) || 0;
  });

  const bondDiscount = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && state.bonding[bond].bondDiscount) || 0;
  });
  const maxBondPrice = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && state.bonding[bond].maxBondPrice) || 0;
  });
  const interestDue = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && state.bonding[bond].interestDue) || 0;
  });
  const pendingPayout = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && Number(state.bonding[bond].pendingPayout)) || 0;
  });
  const debtRatio = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && Number(state.bonding[bond].debtRatio)) || 0;
  });
  const bondQuote = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && state.bonding[bond].bondQuote) || 0;
  });
  const balance = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && Number(state.bonding[bond].balance)) || 0;
  });
  const allowance = useAppSelector(state => {
    return (state.bonding && state.bonding[bond] && state.bonding[bond].allowance) || 0;
  });

  const pendingTransactions = useAppSelector(state => {
    return state.pendingTransactions;
  });

  const hasEnteredAmount = () => {
    return !(isNaN(quantity) || quantity === 0);
  };

  const vestingPeriod = () => {
    const vestingBlock = parseInt(currentBlock.toString()) + parseInt(vestingTerm.toString());
    const seconds = secondsUntilBlock(currentBlock, vestingBlock);
    return prettifySeconds(seconds, "day");
  };

  async function onBond() {
    console.log("slippage = ", slippage);
    console.log("recipientAddress = ", recipientAddress);

    if (quantity === 0) {
      alert("Please enter a value greater than 0!");
    } else if (isNaN(quantity)) {
      alert("Please enter a valid value!");
    } else if (interestDue > 0 || pendingPayout > 0) {
      const shouldProceed = window.confirm(
        "You have an existing bond. Bonding will reset your vesting period and forfeit rewards. We recommend claiming rewards first or using a fresh wallet. Do you still want to proceed?",
      );
      if (shouldProceed) {
        await dispatch(
          bondAsset({
            value: quantity.toString(),
            slippage,
            bond,
            networkID: chainID,
            provider,
            address: recipientAddress || address,
          }),
        );
      }
    } else {
      await dispatch(
        bondAsset({
          value: quantity.toString(),
          slippage,
          bond,
          networkID: chainID,
          provider,
          address: recipientAddress || address,
        }),
      );
    }
  }

  const hasAllowance = useCallback(() => {
    return allowance > 0;
  }, [allowance]);

  const setMax = () => {
    if (!balance) return;
    setQuantity(balance);
  };

  const balanceUnits = () => {
    if (bond.indexOf("_lp") >= 0) return "LP";
    else if (bond === BONDS.dai) return "DAI";
    else if (bond === BONDS.eth) return "wETH";
    else return "FRAX";
  };

  async function loadBondDetails() {
    if (provider) await dispatch(calcBondDetails({ bond, value: quantity.toString(), provider, networkID: chainID }));

    if (provider && address) {
      await dispatch(calculateUserBondDetails({ address, bond, provider, networkID: chainID }));
    }
  }

  useEffect(() => {
    loadBondDetails();
    if (address) setRecipientAddress(address);
  }, [provider, quantity, address]);

  const onSeekApproval = async () => {
    await dispatch(changeApproval({ bond, provider, networkID: chainID }));
  };

  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" justifyContent="space-around" flexWrap="wrap">
        <FormControl className="ohm-input" variant="outlined" color="primary" fullWidth>
          <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
          <OutlinedInput
            id="outlined-adornment-amount"
            type="number"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            // startAdornment={<InputAdornment position="start">$</InputAdornment>}
            labelWidth={55}
            endAdornment={
              <InputAdornment position="end">
                <Button variant="text" onClick={setMax}>
                  Max
                </Button>
              </InputAdornment>
            }
          />
        </FormControl>
        {hasAllowance() ? (
          <Button
            variant="contained"
            color="primary"
            id="bond-btn"
            className="transaction-button"
            disabled={isPendingTxn(pendingTransactions, "bond_" + bond)}
            onClick={onBond}
          >
            {txnButtonText(pendingTransactions, "bond_" + bond, "Bond")}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            id="bond-approve-btn"
            className="transaction-button"
            disabled={isPendingTxn(pendingTransactions, "approve_" + bond)}
            onClick={onSeekApproval}
          >
            {txnButtonText(pendingTransactions, "approve_" + bond, "Approve")}
          </Button>
        )}

        {!hasAllowance() && (
          <div className="help-text">
            <em>
              <Typography variant="body2">
                Note: The "Approve" transaction is only needed when bonding for the first time; subsequent bonding only
                requires you to perform the "Bond" transaction.
              </Typography>
            </em>
          </div>
        )}
      </Box>

      <Slide direction="left" in={true} mountOnEnter unmountOnExit {...{ timeout: 533 }}>
        <Box className="bond-data">
          <div className="data-row">
            <Typography>Your Balance</Typography>
            <Typography>
              {trim(balance, 4)} {balanceUnits()}
            </Typography>
          </div>

          <div className={`data-row`}>
            <Typography>You Will Get</Typography>
            <Typography id="bond-value-id" className="price-data">
              {trim(bondQuote, 4) || ""} OHM
            </Typography>
          </div>

          <div className={`data-row`}>
            <Typography>Max You Can Buy</Typography>
            <Typography id="bond-value-id" className="price-data">
              {trim(maxBondPrice, 4) || ""} OHM
            </Typography>
          </div>

          <div className="data-row">
            <Typography>ROI</Typography>
            <Typography>{trim(bondDiscount * 100, 2)}%</Typography>
          </div>

          <div className="data-row">
            <Typography>Debt Ratio</Typography>
            <Typography>{trim(debtRatio / 10000000, 2)}%</Typography>
          </div>

          <div className="data-row">
            <Typography>Vesting Term</Typography>
            <Typography>{vestingPeriod()}</Typography>
          </div>

          {recipientAddress !== address && (
            <div className="data-row">
              <Typography>Recipient</Typography>
              <Typography>{shorten(recipientAddress)}</Typography>
            </div>
          )}
        </Box>
      </Slide>
    </Box>
  );
}

export default BondPurchase;
