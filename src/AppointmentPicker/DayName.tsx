import React, { Component } from 'react';

interface dayNameProps {
  dayName: string;
  monthNumber?: string;
  dayNumber?: string;
  visible: boolean;
}

export default class dayName extends Component<dayNameProps> {
  render() {
    const { visible, monthNumber, dayNumber, dayName } = this.props;
    return visible ? (
      <>
        <div className='appointment-picker__col__name'>
          <div>{dayName}</div>
          <div>{`${dayNumber}/${monthNumber}`}</div>
        </div>
      </>
    ) : null;
  }
}
