import Head from 'next/head';
import styles from 'styles/Home.module.css';
import Request from 'network/cache';
import { Column, Table, AutoSizer, SortDirection } from 'react-virtualized';
import React from 'react';
import _ from 'lodash';
import 'react-virtualized/styles.css';
import useFilters from 'hooks/useFiltered';
import { useRouter } from 'next/router';
import useLocalStorage from 'hooks/useLocalStorage';

const ge = Request.path('api/hello');

function VTable({ list, refresh }) {
  const [
    { sorted = list, sortBy = 'margin', direction = SortDirection.DESC },
    setState,
  ] = React.useState({});

  const sort = React.useCallback(
    ({ sortBy, sortDirection: direction }) => {
      if (sortBy === 'refresh') {
        refresh();
        return;
      }
      const sorted = _.sortBy(list, [sortBy]);
      if (direction === SortDirection.DESC) {
        sorted.reverse();
      }
      setState({ sorted, sortBy, direction });
    },
    [list, refresh]
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <Table
          width={width}
          height={height}
          className="table"
          headerHeight={20}
          rowHeight={50}
          rowCount={sorted.length}
          sort={sort}
          sortBy={sortBy}
          sortDirection={direction}
          rowGetter={({ index }) => sorted[index]}
        >
          <Column
            label="Name"
            dataKey="name"
            width={350}
            minWidth={50}
            cellDataGetter={({ rowData }) => rowData}
            cellRenderer={({ cellData }) => {
              const url = cellData.icon.split(' ').join('_');
              return (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <a
                    title="View item"
                    href={`https://oldschool.runescape.wiki/w/${
                      url.split('.')[0]
                    }`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      height="30px"
                      src={`https://oldschool.runescape.wiki/images/${url}`}
                    />
                  </a>
                  <a
                    title="View realtime prices"
                    href={`https://prices.runescape.wiki/osrs/item/${cellData.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {cellData.name}
                  </a>
                </div>
              );
            }}
          />
          <Column
            width={70}
            minWidth={50}
            label="volume"
            dataKey="volume"
            cellDataGetter={({ rowData }) => rowData.volume?.toLocaleString()}
          />
          <Column
            width={150}
            minWidth={90}
            label="margin"
            dataKey="margin"
            cellDataGetter={({ rowData }) => rowData.margin?.toLocaleString()}
          />
          <Column
            width={150}
            minWidth={90}
            label="buy"
            dataKey="low"
            cellDataGetter={({ rowData }) => rowData}
            cellRenderer={({ cellData }) => {
              const time = new Date(cellData.prices.lowTime);
              return (
                <p
                  title={`${time.toLocaleDateString()} ${time.toLocaleTimeString()}`}
                >
                  {cellData.low?.toLocaleString()}
                </p>
              );
            }}
          />
          <Column
            width={150}
            minWidth={90}
            label="sell"
            dataKey="high"
            cellDataGetter={({ rowData }) => rowData}
            cellRenderer={({ cellData }) => {
              const time = new Date(cellData.prices.highTime);
              return (
                <p
                  title={`${time.toLocaleDateString()} ${time.toLocaleTimeString()}`}
                >
                  {cellData.high?.toLocaleString()}
                </p>
              );
            }}
          />
          <Column
            width={150}
            minWidth={50}
            label="limit"
            dataKey="limit"
            cellDataGetter={({ rowData }) => rowData.limit?.toLocaleString()}
          />
          <Column
            width={150}
            minWidth={50}
            label="profit"
            dataKey="profit"
            cellDataGetter={({ rowData }) => rowData.profit?.toLocaleString()}
          />
          <Column width={150} label="↺" dataKey="refresh" />
        </Table>
      )}
    </AutoSizer>
  );
}

const volume_filters = {
  Low: {
    volume(v) {
      return v >= 1;
    },
  },
  Mid: {
    volume(v) {
      return v >= 45;
    },
  },
  All: {},
};

export default function Home() {
  const {
    query: { max = '4m' },
    push,
  } = useRouter();
  const { data, refresh } = ge.query({ max }).useCache({ wait: 700 });
  const [selectedVolumeFilter, setSelectedVolumeFilter] = useLocalStorage(
    'volume',
    'Mid'
  );
  const { search, filtered, setFiltered, clear } = useFilters(
    data,
    volume_filters[selectedVolumeFilter]
  );
  return (
    <div className={styles.container}>
      <Head>
        <title>RuneMommy 🥵</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <input
          onChange={e => search('name', e.currentTarget.value)}
          className={styles.search}
          placeholder="Search"
        />
        <input
          defaultValue={max}
          onKeyPress={e => {
            if (!e.currentTarget.value) return;
            if (e.code !== 'Enter') return;
            push(`/?max=${e.currentTarget.value}`);
          }}
          className={styles.search}
          placeholder="Set max buy price"
        />
        <button
          disabled={selectedVolumeFilter === 'All'}
          onClick={() => {
            setSelectedVolumeFilter('All');
            clear();
          }}
        >
          All
        </button>
        <button
          disabled={selectedVolumeFilter === 'Low'}
          onClick={() => {
            setSelectedVolumeFilter('Low');
            setFiltered({
              volume(v) {
                return v >= 1;
              },
            });
          }}
        >
          Low
        </button>
        <button
          disabled={selectedVolumeFilter === 'Mid'}
          onClick={() => {
            setSelectedVolumeFilter('Mid');
            setFiltered({
              volume(v) {
                return v >= 45;
              },
            });
          }}
        >
          Mid
        </button>
        <VTable list={filtered} refresh={refresh} />
      </main>
    </div>
  );
}
