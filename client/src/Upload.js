import React, { useState, useEffect } from 'react';
import axios from 'axios'
import CSVReader from 'react-csv-reader'
import './App.css';
import '../node_modules/react-vis/dist/style.css';

import {
  USER_1,
  USER_2,
  CC_USER_1,
  CC_USER_2,
  CC_USER_3,
  CC_USER_4,
  CC_USER_5,
  CC_USER_6,
  GROUP
} from './constants/entities'

import { ChaseToSplitwiseCategories } from './utils/mapping'

import Table, { EditableCell, DropdownCell, CheckboxCell, DropdownCell2 } from './components/Table/Table'

export default function Upload({ onUpload }) {

  const [data, setData] = useState([])
  const [header, setHeader] = useState([])
  const [categories, setCategories] = useState([])
  const [ccUser, setCCUser] = useState(CC_USER_1)

  useEffect(() => {
    const getCategories = async () => {
      const { data } = await axios.get(`http://localhost:3080/categories`)
      setCategories(data.categories)
    }
    getCategories()
  }, [])

  const handleFileLoad = (data, currCC) => {
    const dataJson = data.slice(1, -1).
      map(item => {
        let currVal = ChaseToSplitwiseCategories[item[3]]
        if (!currVal) {
          currVal = ChaseToSplitwiseCategories.default
        }
        let d = {
          split: 'half',
          notes: '',
          type: 'Sale',
          exclude: true
        }
        // TODO: make this not a hardcode, either using config or UI-editable
        switch (currCC) {
          case CC_USER_3: 
            d = {
              ...d,
              transaction_date: item[1],
              description: item[2],
              category: currVal,
              amount: parseFloat(item[3]),
            }
            break
          case CC_USER_4:
            d = {
              ...d,
              transaction_date: item[1],
              description: item[3],
              category: ChaseToSplitwiseCategories[item[4]],
              amount: parseFloat(item[5]) || -parseFloat(item[6]),
            }
            break
          case CC_USER_5:
            d = {
              ...d,
              transaction_date: item[0],
              description: item[4],
              category: currVal,
              amount: -parseFloat(item[1]),
            }
            break
          default:
            d = {
              ...d,
              transaction_date: item[0],
              description: item[2],
              category: currVal,
              amount: -parseFloat(item[5]),
            }
        }

        return d
      })
    setData(dataJson)
    setHeader(data.slice(0, 1))
  }

  const handleSave = async () => {
    try {
      for (let i = 0; i < data.length; i++) {
        if (data[i].exclude) {
          continue
        }
        let user_1_paid = 0;
        let user_1_owed = 0;
        let user_2_paid = 0;
        let user_2_owed = 0;
        let cc_paid = 0;
        let cc_owed = 0;

        // case when refund
        const absVal = Math.abs(data[i].amount)
        if (data[i].amount < 0) {
          cc_owed = absVal
          if (data[i].split === 'half') {
            user_1_paid = parseFloat((absVal / 2).toFixed(2))
            user_2_paid = absVal - user_1_paid
          }
          else if (data[i].split === 'user_1') {
            user_1_paid = absVal
          }
          else {
            user_2_paid = absVal
          }
        }
        // case when expense
        else {
          cc_paid = data[i].amount
          if (data[i].split === 'half') {
            user_1_owed = parseFloat((data[i].amount / 2).toFixed(2))
            user_2_owed = data[i].amount - user_1_owed
          }
          else if (data[i].split === 'user_1') {
            user_1_owed = data[i].amount
            
          }
          else {
            user_2_owed = data[i].amount
          }
        }

        const body2 = {
          "cost": absVal,
          "group_id": GROUP,
          "description": data[i].description,
          "date": new Date(data[i].transaction_date).toISOString(),
          "repeat_interval": "never",
          "currency_code": "USD",
          "category_id": data[i].category,
          "users__0__user_id": USER_1, // user_1
          "users__0__paid_share": user_1_paid.toString(),
          "users__0__owed_share": user_1_owed.toString(),
          "users__1__user_id": ccUser, //cc
          "users__1__paid_share": cc_paid.toString(),
          "users__1__owed_share": cc_owed.toString(),
          "users__2__user_id": USER_2, //user_2
          "users__2__paid_share": user_2_paid.toString(),
          "users__2__owed_share": user_2_owed.toString(),
          "details": data[i].notes
        }
        await axios.post(`http://localhost:3080/expenses`, body2)
      }
      onUpload()
    } catch (e) {

    }
  }

  const handleUpdateData = (rowIndex, columnId, value) => {
    // We also turn on the flag to not reset the page
    // setSkipPageReset(true)
    setData(old =>
      old.map((row, index) => {
        if (index === rowIndex) {
          if (columnId !== 'exclude'){

            return {
              ...old[rowIndex],
              [columnId]: value,
              exclude: false
            }
          }
          else {
            return {
              ...old[rowIndex],
              [columnId]: value
            }
          }
        }
        return row
      })
    )
  }

  const columns = React.useMemo(
    () => [
      {
        Header: 'Transaction Date',
        accessor: 'transaction_date',
      },
      {
        Header: 'Description',
        accessor: 'description',
      },
      {
        Header: 'Category',
        accessor: 'category',
        Cell: (props) => {
          return <DropdownCell {...props} options={categories} />
        }

      },
      {
        Header: 'Amount',
        accessor: 'amount',
      },
      {
        Header: 'Split',
        accessor: 'split',
        Cell: (props) => {
          return <DropdownCell2 {...props} options={[
            {
              label: 'Half',
              value: 'half'
            },
            {
              label: 'User 2',
              value: 'user_2'
            },
            {
              label: 'User 1',
              value: 'user_1'
            },
          ]} />
        }
      },
      {
        Header: 'Notes ',
        accessor: 'notes',
        Cell: EditableCell
      },
      {
        Header: 'Exclude? ',
        accessor: 'exclude',
        Cell: CheckboxCell
      },
    ],
    [categories]
  )

  return (
    <div className="App">
      <CSVReader
        cssClass="react-csv-input"
        label="Select CSV"
        onFileLoaded={(data) => {handleFileLoad(data,parseInt(ccUser))}}
      />
      <select value={ccUser} onChange={(e) => { console.log(e.target.value); setCCUser(e.target.value) }}>
        {[
          {
            label: 'CC User 1',
            value: CC_USER_1
          },
          {
            label: 'CC User 2',
            value: CC_USER_2
          },
          {
            label: 'CC User 6',
            value: CC_USER_6
          },
          {
            label: 'CC User 3',
            value: CC_USER_3
          },
          {
            label: 'CC User 4',
            value: CC_USER_4
          },
          {
            label: 'CC User 5',
            value: CC_USER_5
          },
        ].map((option, idx) => {
          return <option label={option.label} key={idx} value={option.value}></option>
        })}
      </select>
      <button onClick={handleSave}>Save</button>
      <Table columns={columns} data={data} updateData={handleUpdateData} />
    </div>
  );
}
