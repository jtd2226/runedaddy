import Head from 'next/head';
import styles from 'styles/Home.module.css';
import Request from 'network/cache';
import { Column, Table, AutoSizer, SortDirection } from 'react-virtualized';
import React from 'react';
import _ from 'lodash';
import 'react-virtualized/styles.css';
import useFilters from 'hooks/useFiltered';
import { useRouter } from 'next/router';

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
            width={150}
            minWidth={90}
            label="margin"
            dataKey="margin"
            cellDataGetter={({ rowData }) => rowData.margin?.toLocaleString()}
          />
          <Column
            width={150}
            minWidth={90}
            label="low"
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
            label="high"
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

export default function Home() {
  const {
    query: { max = 4000000 },
  } = useRouter();
  const { data, refresh } = ge.query({ max }).useCache({ wait: 700 });
  const { search, filtered } = useFilters(data);
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
        <VTable list={filtered} refresh={refresh} />
      </main>
    </div>
  );
}
