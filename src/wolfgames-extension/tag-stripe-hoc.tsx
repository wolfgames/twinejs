import * as React from 'react';

export const withWolfgames = (span: JSX.Element) => {
  return <span className={span.props.className}>
    {span}
    {span.key}
  </span>;
};
