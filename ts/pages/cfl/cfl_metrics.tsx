import numeral from 'numeral';
import * as React from 'react';
import styled from 'styled-components';

import { Icon } from 'ts/components/icon';
import { Tab, Tabs } from 'ts/components/tabs';
import { defaultData } from 'ts/pages/cfl/default_data';
import { Metrics, MetricValue } from 'ts/pages/cfl/metrics';
import { backendClient } from 'ts/utils/backend_client';

import { CFLMetricsPairData } from 'ts/types';

const SLIPPAGE_TOOLTIP_TEXT =
    'Percent difference between the expected price of a buy and the price at which the buy is executed.';

const CFLMetricsContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: fit-content;
    @media (max-width: 768px) {
        margin-top: 60px;
    }
    @media (min-width: 768px) {
        margin-left: 60px;
    }
`;

const MetricsContainer = styled.div`
    display: flex;
    margin-top: 15px;
    & div:not(:last-child) {
        margin-right: 15px;
    }
`;

interface CFLMetricsProps {}

interface CFLMetricsState {
    cflMetricsData: CFLMetricsPairData[];
    selectedIndex: number;
}

export class CFLMetrics extends React.Component<CFLMetricsProps, CFLMetricsState> {
    public state: CFLMetricsState = {
        selectedIndex: 0,
        cflMetricsData: defaultData,
    };
    public componentDidMount(): void {
        // tslint:disable-next-line:no-floating-promises
        this._updateCFLMetricsDataAsync();
    }
    public render(): React.ReactNode {
        const { cflMetricsData, selectedIndex } = this.state;
        const quoteToken = this._getSelectedPairData().quoteAssetSymbol;
        return (
            <CFLMetricsContainer>
                <Tabs>
                    {cflMetricsData.map((data, index) => {
                        const symbol = `${data.baseAssetSymbol} / ${data.quoteAssetSymbol}`;
                        return (
                            <Tab
                                key={symbol}
                                isSelected={selectedIndex === index}
                                onClick={this._onTabClick.bind(this, index)}
                            >
                                {symbol}
                            </Tab>
                        );
                    })}
                </Tabs>
                <MetricsContainer>
                    <Metrics title={`Price in ${quoteToken}`} metrics={[{ value: this._getLastPrice() }]} />
                    <Metrics title="7 day volume" metrics={[{ value: this._getVolume() }]} />
                </MetricsContainer>
                <MetricsContainer>
                    <Metrics
                        title={`7 day average slippage for $10,000`}
                        info={SLIPPAGE_TOOLTIP_TEXT}
                        metrics={this._getSlippageMetrics()}
                    />
                </MetricsContainer>
            </CFLMetricsContainer>
        );
    }
    private async _updateCFLMetricsDataAsync(): Promise<void> {
        try {
            const data = await backendClient.getCFLMetricsAsync();
            this.setState({
                cflMetricsData: data,
            });
        } catch (err) {
            // Do nothing. Will remain in loading state.
        }
    }
    private _onTabClick(index: number): void {
        this.setState({ selectedIndex: index });
    }
    private _getSelectedPairData(): CFLMetricsPairData {
        return this.state.cflMetricsData[this.state.selectedIndex];
    }
    private _getLastPrice(): string {
        const data = this._getSelectedPairData();
        if (!data.lastTradePrice) {
            return '—';
        }
        const num = numeral(data.lastTradePrice);
        return num.format('0.00');
    }
    private _getVolume(): string {
        const data = this._getSelectedPairData();
        if (!data.volumeUSD) {
            return '—';
        }
        const num = numeral(data.volumeUSD);
        return num.format('$0,0');
    }
    private _getSlippageMetrics(): MetricValue[] {
        const data = this._getSelectedPairData();
        const placeholder = '—';
        if (!data.exchangeAverageSlippagePercentage) {
            return [
                {
                    label: <Icon name="small_0x_logo" size="natural" />,
                    value: placeholder,
                },
                {
                    label: <Icon name="small_kyber_logo" size="natural" />,
                    value: placeholder,
                },
                {
                    label: <Icon name="small_uniswap_logo" size="natural" />,
                    value: placeholder,
                },
            ];
        }
        const zeroExSlippage = data.exchangeAverageSlippagePercentage.find(
            (exchangeSlippage) => exchangeSlippage.exchange === 'Bamboo Relay',
        );
        const kyberSlippage = data.exchangeAverageSlippagePercentage.find(
            (exchangeSlippage) => exchangeSlippage.exchange === 'Kyber',
        );
        const uniswapSlippage = data.exchangeAverageSlippagePercentage.find(
            (exchangeSlippage) => exchangeSlippage.exchange === 'Uniswap',
        );
        const formatSlippage = (num: string) => numeral(num).format('0.00%');
        return [
            {
                label: <Icon name="small_0x_logo" size="natural" />,
                value: zeroExSlippage ? formatSlippage(zeroExSlippage.slippage) : placeholder,
            },
            {
                label: <Icon name="small_kyber_logo" size="natural" />,
                value: kyberSlippage ? formatSlippage(kyberSlippage.slippage) : placeholder,
            },
            {
                label: <Icon name="small_uniswap_logo" size="natural" />,
                value: uniswapSlippage ? formatSlippage(uniswapSlippage.slippage) : placeholder,
            },
        ];
    }
}
