import React from 'react'


const Header = () => {
  return (
    <header className="univest-header">
      <button className="back_btn_head" onClick={() => window.history.back()}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.23077 24L8 22.7692L14.7692 16L8 9.23077L9.23077 8L16 14.7692L22.7692 8L24 9.23077L17.2308 16L24 22.7692L22.7692 24L16 17.2308L9.23077 24Z"
          fill="#202020"
        />
      </svg>
      </button>
      <img src="./Frame 1171276551.svg"></img>
    </header>
  )
}

export default Header
